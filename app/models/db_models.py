"""SQLAlchemy ORM models for workout tracking and coaching data."""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class DBUser(Base):
    """Stores a user's permanent profile and long-term fitness context."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    gender: Mapped[str] = mapped_column(String(50), nullable=False)
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    height_cm: Mapped[int] = mapped_column(Integer, nullable=False)
    weight_kg: Mapped[float] = mapped_column(Float, nullable=False)
    body_proportion: Mapped[str] = mapped_column(String(50), nullable=False)
    dietary_goal: Mapped[str] = mapped_column(String(50), nullable=False)
    recovery_capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    experience_level: Mapped[str] = mapped_column(String(50), nullable=False)
    days_per_week: Mapped[int] = mapped_column(Integer, nullable=False)
    session_length_mins: Mapped[int] = mapped_column(Integer, nullable=False)
    primary_goal: Mapped[str] = mapped_column(String(100), nullable=False)
    focus_areas: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    injuries_limitations: Mapped[str] = mapped_column(Text, nullable=False)
    equipment_access: Mapped[str] = mapped_column(String(100), nullable=False)

    workout_plans: Mapped[List["DBWorkoutPlan"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    workout_weeks: Mapped[List["DBWorkoutWeek"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )


class DBWorkoutPlan(Base):
    """Stores one saved workout-plan cycle for a specific user."""

    __tablename__ = "workout_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    week_label: Mapped[str] = mapped_column(String(100), nullable=False)
    created_date: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped["DBUser"] = relationship(back_populates="workout_plans")
    exercises: Mapped[List["DBExercise"]] = relationship(
        back_populates="workout_plan",
        cascade="all, delete-orphan",
    )


class DBWorkoutWeek(Base):
    """Stores one true persisted workout week for a specific user."""

    __tablename__ = "workout_weeks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    week_index: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(150), nullable=False)
    created_date: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped["DBUser"] = relationship(back_populates="workout_weeks")
    days: Mapped[List["DBWorkoutDay"]] = relationship(
        back_populates="workout_week",
        cascade="all, delete-orphan",
        order_by="DBWorkoutDay.day_order",
    )
    weekly_feedback: Mapped[Optional["DBWeeklyFeedback"]] = relationship(
        back_populates="workout_week",
        cascade="all, delete-orphan",
        uselist=False,
    )


class DBWorkoutDay(Base):
    """Stores one workout day belonging to a specific persisted workout week."""

    __tablename__ = "workout_days"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    week_id: Mapped[int] = mapped_column(
        ForeignKey("workout_weeks.id"),
        nullable=False,
        index=True,
    )
    day_order: Mapped[int] = mapped_column(Integer, nullable=False)
    day_name: Mapped[str] = mapped_column(String(100), nullable=False)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    workout_week: Mapped["DBWorkoutWeek"] = relationship(back_populates="days")
    exercises: Mapped[List["DBExercise"]] = relationship(
        back_populates="workout_day",
        cascade="all, delete-orphan",
    )


class DBWeeklyFeedback(Base):
    """Stores one free-text weekly review for a completed workout week."""

    __tablename__ = "weekly_feedback"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    week_id: Mapped[int] = mapped_column(
        ForeignKey("workout_weeks.id"),
        nullable=False,
        unique=True,
        index=True,
    )
    feedback_text: Mapped[str] = mapped_column(Text, nullable=False)
    created_date: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    workout_week: Mapped["DBWorkoutWeek"] = relationship(back_populates="weekly_feedback")


class DBExercise(Base):
    """Stores planned exercise targets alongside actual user performance."""

    __tablename__ = "exercises"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    workout_plan_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("workout_plans.id"),
        nullable=True,
        index=True,
    )
    workout_day_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("workout_days.id"),
        nullable=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    target_sub_muscle: Mapped[str] = mapped_column(String(150), nullable=False)
    biomechanical_reason: Mapped[str] = mapped_column(Text, nullable=False)
    reps_goal: Mapped[str] = mapped_column(String(50), nullable=False)
    rest_goal: Mapped[str] = mapped_column(String(50), nullable=False)
    actual_reps: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    actual_weight: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    user_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    workout_plan: Mapped["DBWorkoutPlan"] = relationship(back_populates="exercises")
    workout_day: Mapped[Optional["DBWorkoutDay"]] = relationship(back_populates="exercises")
    set_logs: Mapped[List["DBSetLog"]] = relationship(
        back_populates="exercise",
        cascade="all, delete-orphan",
    )


class DBSetLog(Base):
    """Stores one performed set for a saved exercise during active workout mode."""

    __tablename__ = "set_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    exercise_id: Mapped[int] = mapped_column(
        ForeignKey("exercises.id"),
        nullable=False,
        index=True,
    )
    set_number: Mapped[int] = mapped_column(Integer, nullable=False)
    weight_kg: Mapped[float] = mapped_column(Float, nullable=False)
    reps: Mapped[int] = mapped_column(Integer, nullable=False)
    completed: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    exercise: Mapped["DBExercise"] = relationship(back_populates="set_logs")

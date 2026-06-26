-- Non-destructive schema definition for the minimal Admin ORM model.
-- Existing authorization continues to use User.userRole = 'admin'.

CREATE TABLE IF NOT EXISTS `Admin` (
  `adminId` INT NOT NULL AUTO_INCREMENT,
  `userId` INT NOT NULL,
  `permissions` JSON NOT NULL,
  `createDate` DATETIME NOT NULL,
  `updateDate` DATETIME NOT NULL,
  PRIMARY KEY (`adminId`),
  UNIQUE KEY `admin_user_unique` (`userId`),
  CONSTRAINT `admin_user_fk`
    FOREIGN KEY (`userId`) REFERENCES `User` (`userId`)
    ON UPDATE CASCADE
    ON DELETE CASCADE
);

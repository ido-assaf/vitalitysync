const mockApiClient = jest.fn();

jest.mock("axios", () => ({
  create: () => mockApiClient
}));

test("login surfaces backend authentication errors before network fallbacks", async () => {
  const { login } = require("./api");

  mockApiClient.mockRejectedValueOnce({
    response: {
      data: {
        error: {
          message: "Invalid email or password."
        }
      }
    }
  });

  await expect(login("hbsus1949@gmail.com", "123456")).rejects.toThrow(
    "Invalid email or password."
  );
});

test("login only reports Network Error when no response is available", async () => {
  const { login } = require("./api");

  mockApiClient.mockRejectedValueOnce({
    request: {}
  });

  await expect(login("student@example.com", "123456")).rejects.toThrow("Network Error");
});

test("photo meal estimation sends multipart form data to the existing endpoint", async () => {
  const { estimateNutritionMeal } = require("./api");
  const image = new File(["meal"], "meal.jpg", { type: "image/jpeg" });
  mockApiClient.mockResolvedValueOnce({
    data: {
      success: true,
      data: { estimateId: "estimate-1" },
      error: null
    }
  });

  await estimateNutritionMeal(
    {
      description: "",
      portionSize: "full_plate",
      customPortion: null,
      cookingStyle: "unknown"
    },
    image
  );

  expect(mockApiClient).toHaveBeenCalledWith(
    expect.objectContaining({
      method: "POST",
      url: "/nutrition/estimate-meal",
      data: expect.any(FormData)
    })
  );
  const request = mockApiClient.mock.calls[0][0];
  expect(request.data.get("image")).toBe(image);
  expect(request.data.get("portionSize")).toBe("full_plate");
});

test("clears malformed or unsupported stored users", () => {
  const { getStoredUser } = require("./api");

  localStorage.setItem(
    "vitalitysyncUser",
    JSON.stringify({ userId: 1, userRole: "legacy-user" })
  );

  expect(getStoredUser()).toBeNull();
  expect(localStorage.getItem("vitalitysyncUser")).toBeNull();
});

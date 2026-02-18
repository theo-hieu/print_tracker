import auth from "../middleware/auth";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

jest.mock("jsonwebtoken");

describe("Auth Middleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction = jest.fn();

  beforeEach(() => {
    mockRequest = {
      header: jest.fn(),
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  it("should return 401 if no token provided", () => {
    (mockRequest.header as jest.Mock).mockReturnValue(null);
    auth(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(mockResponse.status).toHaveBeenCalledWith(401);
  });

  it("should return 400 if token is invalid", () => {
    (mockRequest.header as jest.Mock).mockReturnValue("Bearer invalidtoken");
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error("Invalid token");
    });

    auth(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(mockResponse.status).toHaveBeenCalledWith(400);
  });

  it("should call next if token is valid", () => {
    const userPayload = { UserID: 1, UserName: "Test" };
    (mockRequest.header as jest.Mock).mockReturnValue("Bearer validtoken");
    (jwt.verify as jest.Mock).mockReturnValue(userPayload);

    auth(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(jwt.verify).toHaveBeenCalled();
    expect((mockRequest as any).user).toEqual(userPayload);
    expect(nextFunction).toHaveBeenCalled();
  });
});

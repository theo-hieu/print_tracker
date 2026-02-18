import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.error(err);

  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation Error",
      details: (err as any).errors,
    });
    return;
  }

  res.status(500).json({
    error: "Internal Server Error",
    message: err.message,
  });
};

export default errorHandler;

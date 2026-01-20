import { plainToInstance } from "class-transformer";
import { validate, ValidationError } from "class-validator";
import { Request, Response, NextFunction } from "express";
import { BadRequestError } from "~/core/error.response";

export const dtoValidation = (
  type: any,
  skipMissingProperties = false
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const dtoObj: any = plainToInstance(type, req.body);
    
    let errors: ValidationError[] = [];

    if (Array.isArray(dtoObj)) {
      for (const item of dtoObj) {
        const itemErrors = await validate(item, { skipMissingProperties });
        errors.push(...itemErrors);
      }
    } else {
      errors = await validate(dtoObj, { skipMissingProperties });
    }

    if (errors.length > 0) {
      const formatError = (err: ValidationError): string[] => {
        const result: string[] = [];
        if (err.constraints) {
           result.push(...Object.values(err.constraints));
        }
        if (err.children && err.children.length > 0) {
           err.children.forEach(child => result.push(...formatError(child)));
        }
        return result;
      };

      const dtoErrors = errors
        .map((error: ValidationError) => formatError(error).join(", "))
        .join(", ");
        
      next(new BadRequestError({ message: dtoErrors }));
      return;
    }
    
    // Update req.body with the typed instance (optional, but good for transforms)
    req.body = dtoObj;
    next();
  };
};

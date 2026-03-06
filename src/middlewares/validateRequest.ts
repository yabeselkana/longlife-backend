import { Request, Response, NextFunction } from 'express';
import { ZodObject, ZodError } from 'zod';

export const validateRequest = (schema: ZodObject<any, any>) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                console.error('[Validation Error]', JSON.stringify(error.issues, null, 2));
                return res.status(400).json({
                    error: 'Validation failed',
                    issues: error.issues.map((err: any) => ({
                        path: err.path.join('.'),
                        message: err.message,
                    })),
                });
            }
            return res.status(500).json({ error: 'Internal server error during validation' });
        }
    };
};

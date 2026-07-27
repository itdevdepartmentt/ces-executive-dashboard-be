export type CurrentUserPayload = {
    id: string;
    email: string;
    role: 'USER' | 'ADMIN';
    name: string;
};
export declare const CurrentUser: (...dataOrPipes: unknown[]) => ParameterDecorator;

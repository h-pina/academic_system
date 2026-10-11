export interface JwtPayload {
  /** `users.id` as a string. Roles are not in the token (see JwtStrategy). */
  sub: string;
}

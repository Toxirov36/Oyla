import { config as loadEnv } from 'dotenv';
import { plainToInstance } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, Min, MinLength, validateSync } from 'class-validator';

loadEnv({ path: process.env.OYLA_ENV_FILE || '.env', override: true, quiet: true });
class Environment {
  @IsString() @Matches(/^postgres(ql)?:\/\//) DATABASE_URL!: string;
  @IsString() @Matches(/^rediss?:\/\//) REDIS_URL!: string;
  @IsString() @MinLength(32) JWT_SECRET!: string;
  @IsInt() @Min(1) @Max(65535) PORT = 3001;
  @IsString() @Matches(/^https?:\/\//) WEB_ORIGIN = 'http://localhost:5173';
  @IsOptional() @IsString() GOOGLE_CLIENT_ID?: string;
  @IsOptional() @IsString() GOOGLE_CLIENT_SECRET?: string;
  @IsOptional() @IsString() @Matches(/^https?:\/\//) GOOGLE_REDIRECT_URI?: string;
  @IsOptional() @IsString() @Matches(/^[a-f0-9]{32}$/i) R2_ACCOUNT_ID?: string;
  @IsOptional() @IsString() R2_ACCESS_KEY_ID?: string;
  @IsOptional() @IsString() R2_SECRET_ACCESS_KEY?: string;
  @IsOptional() @IsString() R2_BUCKET_NAME?: string;
  @IsIn(['development', 'test', 'production']) NODE_ENV = 'development';
  @IsIn(['0', '1']) TRUST_PROXY = '0';
  @IsInt() @Min(1) @Max(10000) AUTH_RATE_LIMIT = 20;
  @IsInt() @Min(1) @Max(10000) API_RATE_LIMIT = 240;
  @IsInt() @Min(1) @Max(10000) PLAY_POLL_RATE_LIMIT = 3000;
}
const input = {
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  PORT: Number(process.env.PORT || 3001),
  WEB_ORIGIN: process.env.WEB_ORIGIN || 'http://localhost:5173',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || process.env.CLIENT_ID || undefined,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || process.env.CLIENT_SECRET || undefined,
  GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || undefined,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID || undefined,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID || undefined,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY || undefined,
  R2_BUCKET_NAME: process.env.R2_BUCKET_NAME || undefined,
  NODE_ENV: process.env.NODE_ENV || 'development',
  TRUST_PROXY: process.env.TRUST_PROXY || '0',
  AUTH_RATE_LIMIT: Number(process.env.AUTH_RATE_LIMIT || 20),
  API_RATE_LIMIT: Number(process.env.API_RATE_LIMIT || 240),
  PLAY_POLL_RATE_LIMIT: Number(process.env.PLAY_POLL_RATE_LIMIT || 3000),
};
export const config = plainToInstance(Environment, input);
const errors = validateSync(config, { validationError: { target: false, value: false } });
if (errors.length)
  throw new Error(`Invalid environment fields: ${errors.map((e) => e.property).join(', ')}`);
if (
  Boolean(config.GOOGLE_CLIENT_ID) !== Boolean(config.GOOGLE_CLIENT_SECRET) ||
  (Boolean(config.GOOGLE_CLIENT_ID) !== Boolean(config.GOOGLE_REDIRECT_URI))
)
  throw new Error('Google OAuth requires GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI together');
if (
  Boolean(config.R2_ACCESS_KEY_ID) !== Boolean(config.R2_SECRET_ACCESS_KEY) ||
  (Boolean(config.R2_ACCESS_KEY_ID) &&
    (!config.R2_ACCOUNT_ID || !config.R2_BUCKET_NAME))
)
  throw new Error('R2 requires R2_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY together');
if (
  config.NODE_ENV === 'production' &&
  (config.JWT_SECRET.includes('replace_') || !config.WEB_ORIGIN.startsWith('https://'))
)
  throw new Error('Production requires a random JWT secret and HTTPS WEB_ORIGIN');

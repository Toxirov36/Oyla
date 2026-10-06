import { config as loadEnv } from 'dotenv';
import { plainToInstance } from 'class-transformer';
import { IsIn, IsInt, IsString, Matches, Max, Min, MinLength, validateSync } from 'class-validator';

loadEnv({ path: process.env.OYLA_ENV_FILE || '.env', override: true, quiet: true });
class Environment {
  @IsString() @Matches(/^postgres(ql)?:\/\//) DATABASE_URL!: string;
  @IsString() @Matches(/^rediss?:\/\//) REDIS_URL!: string;
  @IsString() @MinLength(32) JWT_SECRET!: string;
  @IsInt() @Min(1) @Max(65535) PORT = 3001;
  @IsString() @Matches(/^https?:\/\//) WEB_ORIGIN = 'http://localhost:5173';
  @IsIn(['development', 'test', 'production']) NODE_ENV = 'development';
  @IsIn(['0', '1']) TRUST_PROXY = '0';
  @IsInt() @Min(1) @Max(10000) AUTH_RATE_LIMIT = 20;
  @IsInt() @Min(1) @Max(10000) API_RATE_LIMIT = 240;
}
const input = {
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  PORT: Number(process.env.PORT || 3001),
  WEB_ORIGIN: process.env.WEB_ORIGIN || 'http://localhost:5173',
  NODE_ENV: process.env.NODE_ENV || 'development',
  TRUST_PROXY: process.env.TRUST_PROXY || '0',
  AUTH_RATE_LIMIT: Number(process.env.AUTH_RATE_LIMIT || 20),
  API_RATE_LIMIT: Number(process.env.API_RATE_LIMIT || 240),
};
export const config = plainToInstance(Environment, input);
const errors = validateSync(config, { validationError: { target: false, value: false } });
if (errors.length)
  throw new Error(`Invalid environment fields: ${errors.map((e) => e.property).join(', ')}`);
if (
  config.NODE_ENV === 'production' &&
  (config.JWT_SECRET.includes('replace_') || !config.WEB_ORIGIN.startsWith('https://'))
)
  throw new Error('Production requires a random JWT secret and HTTPS WEB_ORIGIN');

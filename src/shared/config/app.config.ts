export type Environment = 'development' | 'eng' | 'test' | 'prod';

export interface EnvironmentConfig {
  publicPath: string;
  port?: number;
  host?: string;
}

export type EnvConfig = {
  [key in Environment]: EnvironmentConfig;
};

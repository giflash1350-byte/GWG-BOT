import 'dotenv/config';
for (const name of ['DATABASE_URL']) if (!process.env[name]) throw new Error(`Missing ${name}`);
export const config = Object.freeze({ nodeEnv: process.env.NODE_ENV ?? 'development', port: Number(process.env.PORT ?? 3000), databaseUrl: process.env.DATABASE_URL, databaseSsl: process.env.DATABASE_SSL === 'true', discordToken: process.env.DISCORD_TOKEN, discordClientId: process.env.DISCORD_CLIENT_ID, discordGuildId: process.env.DISCORD_GUILD_ID, prefix: process.env.COMMAND_PREFIX ?? 'gwg', adminApiToken: process.env.ADMIN_API_TOKEN });
if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) throw new Error('Invalid PORT');
if (!/^[a-zA-Z0-9!#$%&*+\-._?]{1,12}$/.test(config.prefix)) throw new Error('COMMAND_PREFIX must be 1-12 safe characters');

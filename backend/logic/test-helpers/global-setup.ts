import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { Flyway } from "node-flyway";

let container: StartedPostgreSqlContainer | undefined;

export default async function setup() {
  if (container) return container;

  container = await new PostgreSqlContainer("postgres:15")
    .withDatabase("testdb")
    .withUsername("test")
    .withPassword("test")
    .start();

  const flyway = new Flyway({
    url: `jdbc:postgresql://${container.getHost()}:${container.getPort()}/${container.getDatabase()}`,
    user: container.getUsername(),
    password: container.getPassword(),
    migrationLocations: ["filesystem:../db/migrations"],
  });

  const flywayResponse = await flyway.migrate();

  if (!flywayResponse.success) {
    throw new Error(
      `Database migration failed, ${flywayResponse.error?.message}`,
    );
  }

  process.env.DATABASE_URL = container.getConnectionUri();
  process.env.DB_HOST = container.getHost();
  process.env.DB_PORT = String(container.getPort());
  process.env.DB_USER = container.getUsername();
  process.env.DB_PASSWORD = container.getPassword();
  process.env.DB_NAME = container.getDatabase();

  return async function teardown() {
    if (container) {
      await container.stop();
      container = undefined;
    }
  };
}

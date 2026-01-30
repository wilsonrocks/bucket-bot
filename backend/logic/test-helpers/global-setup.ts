import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";

import { spawnSync } from "node:child_process";

let container: StartedPostgreSqlContainer | undefined;

export default async function setup() {
  if (container) return container;

  console.log("Starting PostgreSQL test container...");
  container = await new PostgreSqlContainer("postgis/postgis:17-3.5")
    .withDatabase("testdb")
    .withUsername("test")
    .withPassword("test")
    .start();

  const jdbcUrl = `jdbc:postgresql://${container.getHost()}:${container.getPort()}/${container.getDatabase()}`;
  console.log("Running Flyway migrations...");
  await runFlyway(jdbcUrl, container.getUsername(), container.getPassword());

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

async function runFlyway(jdbcUrl: string, user: string, password: string) {
  return new Promise<void>((resolve, reject) => {
    const flywayResult = spawnSync(
      "flyway",
      [
        "migrate",
        `-url=${jdbcUrl}`,
        `-user=${user}`,
        `-password=${password}`,
        "-locations=filesystem:./migrations",
      ],
      { stdio: "inherit", cwd: "../db" },
    );
    if (flywayResult.status === 0) {
      resolve();
      return;
    } else if (flywayResult.error) {
      reject(flywayResult.error);
      return;
    }
  });
}

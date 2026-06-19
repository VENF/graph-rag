import neo4j, { type Driver, type Session } from 'neo4j-driver';
import { env } from '../../../../config/env.js';

let driver: Driver | null = null;

export const getDriver = (): Driver => {
  if (!driver) {
    driver = neo4j.driver(env.NEO4J_URI, neo4j.auth.basic(env.NEO4J_USER, env.NEO4J_PASSWORD), {
      connectionTimeout: 5000,
    });
  }
  return driver;
};

export const withSession = async <T>(fn: (session: Session) => Promise<T>): Promise<T> => {
  const session = getDriver().session();
  try {
    return await fn(session);
  } finally {
    await session.close();
  }
};

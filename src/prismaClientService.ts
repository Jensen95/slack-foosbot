import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";

class PrismaClientService {
  #prisma?: PrismaClient;

  initialize(db: D1Database) {
    const adapter = new PrismaD1(db);
    this.#prisma = new PrismaClient({ adapter });
  }

  public get db() {
    return this.#prisma!;
  }
}

export const prismaClientService = new PrismaClientService();

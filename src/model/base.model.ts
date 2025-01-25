import { Schema } from "redis-om";

export class BaseModel {
  protected schema: InstanceType<typeof Schema>;

  constructor(name: string, properties: Record<string, any>) {
    this.schema = new Schema(name, properties);
  }

  getSchema() {
    return this.schema;
  }
}

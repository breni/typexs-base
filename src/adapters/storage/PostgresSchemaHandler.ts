import {AbstractSchemaHandler} from "../../libs/storage/AbstractSchemaHandler";
import * as _ from "lodash";
import {IDBType} from "../../libs/storage/IDBType";
import {JS_DATA_TYPES} from "commons-schema-api/browser";


export class PostgresSchemaHandler extends AbstractSchemaHandler {

  type: string = 'postgres';

  async getCollectionNames(): Promise<string[]> {
    let c = await this.storageRef.connect();
    let q = await c.manager.query('SELECT table_name as name FROM information_schema.tables WHERE table_type=\'BASE TABLE\';');
    return _.map(q, x => x.name);
  }


  translateToStorageType(jsType: string, length: number = null): IDBType {
    let type: IDBType = {
      type: null,
      variant: null,
      sourceType: null,
      length: length
    };

    let split = jsType.split(':');
    type.sourceType = <JS_DATA_TYPES>split.shift();
    if (split.length > 0) {
      type.variant = split.shift();
    }

    switch (type.sourceType) {
      case 'string':
        type.type = 'text';
        if(type.length && type.length > 0){
          type.type = 'varchar'
        }
        break;
      case 'text':
        type.type = 'text';
        break;
      case 'boolean':
        type.type = 'boolean';
        break;
      case 'number':
        type.type = 'int';
        break;
      case 'double':
        type.type = 'float8';
        break;
      case 'time':
        type.type = 'time';
        break;
      case 'date':
        type.type = 'date';
        if(type.variant){
          type.type = 'timestamp with time zone';
        }
        break;
      case 'datetime':
        type.type = 'timestamp with time zone';
        break;
      case 'timestamp':
        type.type = 'timestamp with time zone';
        break;
      case 'json':
        type.type = 'jsonb';
        break;

    }
    return type;
  }

}

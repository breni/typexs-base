import {ICacheAdapter} from "../../libs/cache/ICacheAdapter";
import {PlatformUtils} from "commons-base";
import {ICacheBinConfig} from "../../libs/cache/ICacheBinConfig";
import {ICacheSetOptions} from "../../libs/cache/ICacheOptions";
import {IRedisCacheClient} from "./redis/IRedisCacheClient";
import {CryptUtils, Log} from "../..";

export class RedisCacheAdapter implements ICacheAdapter {

  static REDIS: any;

  readonly type: string = 'redis';

  client: IRedisCacheClient;

  name: string;

  options: ICacheBinConfig;


  async configure(name: string, options: ICacheBinConfig) {
    this.name = name;
    this.options = options;
    this.client = new RedisCacheAdapter.REDIS(this.options);
  }


  hasRequirements(): boolean {
    try {
      PlatformUtils.load('redis');
      RedisCacheAdapter.REDIS = PlatformUtils.load('./redis/RedisCacheClient');
      return true;
    } catch (e) {
      Log.debug('Can\'t load redis cache adapter cause redis npm package isn\'t present');
    }
    return false;
  }


  cacheKey(bin: string, key: string) {
    let hash = CryptUtils.shorthash(key);
    return [bin, key, hash].join('--').replace(/[^\w\d]/, '');
  }


  async get(key: string, bin: string, options: ICacheSetOptions): Promise<any> {
    await this.client.connect();
    const _key = this.cacheKey(bin, key);
    let res = await this.client.get(_key, options);
    return res;
  }


  async set(key: string, value: any, bin: string, options: ICacheSetOptions): Promise<any> {
    await this.client.connect();
    const _key = this.cacheKey(bin, key);
    await this.client.set(_key, value, options);
    return value;
  }


  async shutdown() {
    await this.client.close();
  }


}

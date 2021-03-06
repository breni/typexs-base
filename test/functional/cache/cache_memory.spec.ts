import * as _ from 'lodash';
import {suite, test} from "mocha-typescript";
import {expect} from "chai";

import {Bootstrap} from "../../../src/Bootstrap";
import {Config} from "commons-config";
import {TEST_STORAGE_OPTIONS} from "../config";
import {Container} from "typedi";
import {XS_DEFAULT} from "commons-schema-api";
import {Cache} from "../../../src/libs/cache/Cache";
import {MemoryCacheAdapter} from "../../../src/adapters/cache/MemoryCacheAdapter";

@suite('functional/cache/general')
class Cache_memorySpec {


  before() {
    Bootstrap.reset();
    Config.clear();
  }


  @test
  async 'use default runtime memory cache with default options'() {
    let bootstrap = Bootstrap.configure({
      app: {name: 'test'},
      modules: {paths: [__dirname + '/../../..']},
      storage: {default: TEST_STORAGE_OPTIONS},
    });
    bootstrap.activateLogger();
    bootstrap.activateErrorHandling();
    await bootstrap.prepareRuntime();
    bootstrap = await bootstrap.activateStorage();
    bootstrap = await bootstrap.startup();

    let cache: Cache = Container.get(Cache.NAME);

    let options = cache.getOptions();
    expect(options).to.deep.eq({
      bins: {default: 'default'}
    });

    let adapterClasses = cache.getAdapterClasses();
    expect(adapterClasses).to.have.length(2);
    expect(_.map(adapterClasses, c => c.type)).to.deep.eq(['memory', 'redis']);

    let adapters = cache.getAdapters();
    let instances = _.keys(adapters);
    expect(instances).to.be.deep.eq([XS_DEFAULT]);
    expect(adapters[XS_DEFAULT]).to.be.instanceOf(MemoryCacheAdapter);

    let bins = cache.getBins();
    let binKeys = _.keys(bins);
    expect(binKeys).to.be.deep.eq([XS_DEFAULT]);
    expect(bins[XS_DEFAULT].name).to.be.eq(XS_DEFAULT);

    let noValue = await cache.get('test');
    expect(noValue).to.be.eq(null);

    await cache.set('test', {k: 'asd'});

    let testValue = await cache.get('test');
    expect(testValue).to.be.deep.eq({k: 'asd'});

    const testBin = 'test';
    noValue = await cache.get('test', testBin);
    expect(noValue).to.be.eq(null);

    await cache.set('test', {k: 'asd'}, testBin);

    testValue = await cache.get('test', testBin);
    expect(testValue).to.be.deep.eq({k: 'asd'});

    await bootstrap.shutdown();
  }


  @test
  async 'use runtime memory cache with options'() {
    let bootstrap = Bootstrap.configure({
      app: {name: 'test'},
      modules: {paths: [__dirname + '/../../..']},
      storage: {default: TEST_STORAGE_OPTIONS},
      cache: {bins: {default: 'mem1', test: 'mem2'}, adapter: {mem1: {type: 'memory'}, mem2: {type: 'memory'}}}
    });
    bootstrap.activateLogger();
    bootstrap.activateErrorHandling();
    await bootstrap.prepareRuntime();
    bootstrap = await bootstrap.activateStorage();
    bootstrap = await bootstrap.startup();

    let cache: Cache = Container.get(Cache.NAME);

    let options = cache.getOptions();

    expect(options).to.deep.eq({
        bins: {default: 'mem1', test: 'mem2'},
        adapter:
          {
            mem1: {type: 'memory'},
            mem2: {type: 'memory'}
          }
      }
    );

    let adapterClasses = cache.getAdapterClasses();
    expect(adapterClasses).to.have.length(2);
    expect(_.map(adapterClasses, c => c.type)).to.deep.eq(['memory', 'redis']);

    let adapters = cache.getAdapters();
    let instances = _.keys(adapters);
    expect(instances).to.be.deep.eq(['mem1', 'default', 'mem2']);

    expect(adapters[XS_DEFAULT]).to.be.eq(adapters['mem1']);
    expect(adapters['mem1']).to.be.instanceOf(MemoryCacheAdapter);
    expect(adapters['mem2']).to.be.instanceOf(MemoryCacheAdapter);

    let bins = cache.getBins();
    let binKeys = _.keys(bins);

    expect(binKeys).to.be.deep.eq([XS_DEFAULT,'test']);
    expect(bins[XS_DEFAULT].store.name).to.be.eq('mem1');
    expect(bins['test'].store.name).to.be.eq('mem2');

    let noValue = await cache.get('test');
    expect(noValue).to.be.eq(null);

    await cache.set('test', {k: 'asd'});

    let testValue = await cache.get('test');
    expect(testValue).to.be.deep.eq({k: 'asd'});

    const testBin = 'test';
    noValue = await cache.get('test', testBin);
    expect(noValue).to.be.eq(null);

    await cache.set('test', {k: 'asd'}, testBin);

    testValue = await cache.get('test', testBin);
    expect(testValue).to.be.deep.eq({k: 'asd'});

    await cache.set('test2', "asdasdasd", testBin);

    testValue = await cache.get('test2', testBin);
    expect(testValue).to.be.deep.eq("asdasdasd");

    await bootstrap.shutdown();
  }

}


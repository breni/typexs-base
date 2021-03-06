import * as _ from 'lodash';
import {ModuleRegistry} from "commons-moduls/registry/ModuleRegistry";
import {ClassesLoader, Module} from "commons-moduls";
import {IRuntimeLoaderOptions} from "./IRuntimeLoaderOptions";

import {DEFAULT_RUNTIME_OPTIONS} from "../Bootstrap";
import {TYPEXS_NAME} from "../libs/Constants";
import {PlatformUtils} from "commons-base";
import {Log} from "./../libs/logging/Log";
import {ISchematicsInfo} from "../libs/schematics/ISchematicsInfo";


export class RuntimeLoader {

  static NAME: string = 'RuntimeLoader';

  _options: IRuntimeLoaderOptions;


  registry: ModuleRegistry;


  settings: { [moduleName: string]: any };


  classesLoader: ClassesLoader;


  disabledModuleNames: string[] = [];

  disabledClassNames: string[] = [];


  constructor(options: IRuntimeLoaderOptions) {
    _.defaults(options, _.cloneDeep(DEFAULT_RUNTIME_OPTIONS));
    this._options = options;
    let appdir = this._options.appdir || PlatformUtils.pathResolve('.');

    if (appdir && this._options.paths.indexOf(appdir) === -1) {
      this._options.paths.unshift(appdir);
    }

    this._options.paths = this._options.paths.map(p => {
      if (PlatformUtils.isAbsolute(p)) {
        return p;
      } else {
        return PlatformUtils.join(appdir, p);
      }
    })


  }


  async prepare() {
    await this.rebuild()
  }


  async rebuild() {
    let modulePackageJsonKeys = [TYPEXS_NAME];
    if (this._options.packageKeys) {
      modulePackageJsonKeys = modulePackageJsonKeys.concat(this._options.packageKeys);
    }
    this._options.packageKeys = modulePackageJsonKeys;

    let modulPaths = [];
    for (let _path of this._options.paths) {
      if (PlatformUtils.fileExist(_path)) {
        modulPaths.push(_path);
      } else {
        Log.debug('skipping modul path ' + _path + ', because it does not exists.');
      }
    }

    this.registry = new ModuleRegistry({
      packageFilter: (json: any) => {
        return _.intersection(Object.keys(json), modulePackageJsonKeys).length > 0;
      },
      module: module,
      paths: modulPaths,
      pattern: this._options.subModulPattern ? this._options.subModulPattern : []
    });
    await this.registry.rebuild();


    let settingsLoader = await this.registry.createSettingsLoader({
      ref: 'package.json',
      path: 'typexs'
    });

    this.settings = settingsLoader.getSettings();
    // todo enable all, check against storage

    for (let moduleName in this.settings) {
      if (!this.isIncluded(moduleName)) {
        this.includeModule(moduleName);
      }

      if (this.isEnabled(moduleName)) {
        Log.debug('Load settings from module ' + moduleName);
        let modulSettings = this.settings[moduleName];
        if (_.has(modulSettings, 'declareLibs')) {
          for (let s of modulSettings['declareLibs']) {
            let topicData = _.find(this._options.libs, (lib) => lib.topic === s.topic);
            if (topicData) {
              topicData.refs.push(...s.refs);
              topicData.refs = _.uniq(topicData.refs);
            } else {
              this._options.libs.push(s);
            }
          }
        }
      } else {
        this.disabledModuleNames.push(moduleName);
        Log.debug('Skip settings loading for module ' + moduleName);
      }
    }

    this._options.libs = _.sortBy(this._options.libs, ['topic']);
    this.classesLoader = await this.registry.createClassesLoader({libs: this._options.libs});
  }

  isIncluded(modulName: string) {
    return _.has(this._options.included, modulName);
  }

  includeModule(modulName: string) {
    return _.set(this._options.included, modulName, {enabled: true});
  }

  isEnabled(modulName: string) {
    return _.get(this._options.included, modulName + '.enabled', true);
  }

  async getSettings(key: string) {
    let settingsLoader = await this.registry.createSettingsLoader({
      ref: 'package.json',
      path: key
    });
    if (settingsLoader) {
      let list = settingsLoader.getSettings();
      return list;
    }
    return {};
  }


  getModule(modulName: string): Module {
    return this.registry.modules().find(m => m.name === modulName);
  }


  getClasses(topic: string) {
    if (this.classesLoader) {
      return this.classesLoader.getClassesWithFilter(topic, ((className, modulName) =>
        this.disabledModuleNames.indexOf(modulName) !== -1 ||
        this.disabledClassNames.indexOf(className) !== -1));
    }
    return [];
  }


  async getSchematicsInfos(): Promise<ISchematicsInfo[]> {
    let infos: ISchematicsInfo[] = [];
    let schematics = await this.getSettings('schematics');
    for (let moduleName in schematics) {
      let schematic = schematics[moduleName];
      if (schematic) {
        let module = this.getModule(moduleName);
        let coll = await PlatformUtils.readFile(PlatformUtils.join(module.path, schematic));
        let collectionContent = {};
        if (coll) {
          try {
            collectionContent = JSON.parse(coll.toString('utf-8'))
          } catch (err) {
          }
        }

        infos.push(<ISchematicsInfo>{
          name: moduleName,
          internal: module.internal,
          submodule: module.submodule,
          path: module.path,
          collectionSource: schematic,
          collection: collectionContent
        })
      }
    }
    return infos;
  }


}

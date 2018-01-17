import * as merge from 'deepmerge'
import * as _ from 'lodash'
import {InterpolationSupport} from "commons-config";
import {Options} from "deepmerge";


export class BaseUtils {


  static wait(time: number): Promise<any> {
    return new Promise(resolve => {
      setTimeout(function () {
        resolve()
      }, time)
    })
  }

  static interpolate(msg: string, parameter: { [k: string]: string }): string {
    let data = {msg: msg};
    try {
      InterpolationSupport.exec(data, parameter);
    } catch (e) {
      throw e
    }
    return data.msg
  }

  static flattenDate(d: Date) {
    // reset milliseconds for datefields
    let rest = d.getTime() % 1000;
    return new Date(d.getTime() - rest)
  }

  static now() {
    let now = new Date();
    // reset milliseconds for datefields
    let rest = now.getTime() % 1000;
    return new Date(now.getTime() - rest)
  }

  /**
   * https://stackoverflow.com/questions/1960473/unique-values-in-an-array
   * @param arr
   * @returns {any[]}
   */
  static unique_array(arr: any[]): any[] {
    return _.uniq(arr)
    // return arr.filter((v, i, a) => a.indexOf(v) === i);
  }

  static escapeRegExp(text: string): string {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  }

  static clone(obj: any) {
    return _.clone(obj)
  }

  static mergeArray(dest: any[], source: any[], options?: merge.Options) {
    let res = _.concat(dest, source);
    return BaseUtils.uniqArr(res)
  }

  static uniqArr(res: any[]) {
    return _.uniqBy(res, (entry) => {
      let x = null
      if (_.isFunction(entry)) {
        x = entry.toString();
      } else {
        x = JSON.stringify(entry);
      }
      return x
    });
  }

  static merge(...args: any[]): any {
    return merge.all(args, {arrayMerge: this.mergeArray})
  }

  static walk(root: any, fn: Function) {
    function walk(obj: any, location: any[] = []) {
      if (obj === null || obj === undefined) return;

      Object.keys(obj).forEach((key) => {

        // Value is an array, call walk on each item in the array
        if (Array.isArray(obj[key])) {
          obj[key].forEach((el: any, j: number) => {
            fn({
              value: el,
              key: key,
              index: j,
              location: [...location, ...[key], ...[j]],
              parent: obj,
              isLeaf: false
            });
            walk(el, [...location, ...[key], ...[j]])
          })

          // Value is an object, walk the keys of the object
        } else if (typeof obj[key] === 'object') {
          fn({
            value: obj[key],
            key: key,
            parent: obj,
            index: null,
            location: [...location, ...[key]],
            isLeaf: false
          });
          walk(obj[key], [...location, ...[key]])

          // We've reached a leaf node, call fn on the leaf with the location
        } else {
          fn({
            value: obj[key],
            key: key,
            parent: obj,
            index: null,
            location: [...location, ...[key]],
            isLeaf: true
          })
        }
      })
    }

    walk(root)
  }

  static get(arr: any, path: string = null): any {
    if (path) {
      let paths = path.split('.');
      let first: string | number = paths.shift();
      if (/^[1-9]+\d*$/.test(first)) {
        first = parseInt(first)
      }
      if (arr.hasOwnProperty(first)) {
        let pointer: any = arr[first];
        if (paths.length === 0) {
          return pointer
        } else {
          return BaseUtils.get(pointer, paths.join('.'))
        }
      } else {
        // not found
        return null
      }

    }
    return arr

  }

  static splitTyped(arr: string, sep: string = '.'): any[] {
    let paths = arr.split('.');
    let normPaths: any[] = [];
    paths.forEach(function (_x) {
      if (typeof _x === 'string' && /\d+/.test(_x)) {
        normPaths.push(parseInt(_x))
      } else {
        normPaths.push(_x)
      }

    });
    return normPaths
  }

  static set(arr: any, path: string | any[], value: any): boolean {
    let paths = null;
    let first: string | number = null;

    if (typeof path === 'string') {
      paths = BaseUtils.splitTyped(path)
    } else {
      paths = path
    }
    first = paths.shift();
    let next = paths.length > 0 ? paths[0] : null;


    if (!arr.hasOwnProperty(first)) {
      // new, key doesn't exists
      if (typeof next === 'number') {
        // if next value is a number then this must be an array!
        arr[first] = []
      } else {
        arr[first] = {}
      }
    } else {
      if (Array.isArray(arr)) {
        if (!(typeof first === 'number')) {
          return false
        }
      } else if (Array.isArray(arr[first])) {
        if (!(typeof next === 'number')) {
          return false
        }
      } else if (!BaseUtils.isObject(arr[first])) {
        // primative
        if (BaseUtils.isObject(value)) {
          return false
        }
      } else {
        if (typeof next === 'number') {
          // must be array
          if (!Array.isArray(arr[first])) {
            return false
          }
        }
      }
    }

    if (paths.length > 0) {
      return BaseUtils.set(arr[first], paths, value)
    } else {
      arr[first] = value;
      return true
    }
  }


  static isObject(o: any) {
    return _.isObject(o)
  }


  static isString(o: any) {
    return _.isString(o)
  }

}
import {LogEvent} from "./LogEvent";
//import {LoggerOptions, TransportInstance, TransportOptions} from "winston";
import * as winston from "winston";
import {LoggerInstance, LoggerOptions, TransportOptions} from "winston";
import * as _ from 'lodash'
import {ILoggerOptions} from "./ILoggerOptions";
import * as moment from "moment";
import {BaseUtils} from "../../";
import {TodoException} from "commons-base";

const DEFAULT_TRANSPORT_OPTIONS: TransportOptions = {
  timestamp: true,
  json: false,
  defaultFormatter: true

};

const DEFAULT_OPTIONS: ILoggerOptions = {
  enable: true,

  events: true,

  level: 'info',

  transports: [
    {
      console: {
        name: 'console',
        timestamp: true,
        json: false
      }
    }
  ]
};

export class Log {

  static self: Log = null;

  static enable: boolean = true;

  static prefix: string = '';

  static enableEvents: boolean = true;

  static console: boolean = false;

  private initial: boolean = false;

  private defaultLogger: LoggerInstance = null;

  private _options: ILoggerOptions = null;

  constructor() {
  }

  private create(opts: LoggerOptions): Log {
    this.defaultLogger = new (winston.Logger)(opts);
    this.initial = true;
    return this
  }

  static _() {
    if (!this.self) {
      this.self = new Log()
    }
    return this.self
  }


  get logger(): winston.LoggerInstance {
    if (!this.initial) {
      this.options(DEFAULT_OPTIONS)
    }
    return this.defaultLogger
  }

  private static defaultFormatter(options: any) {
    // Return string will be passed to logger.
    return '[' + moment(Date.now()).format('YYYY.MM.DD HH:mm:ss.SSS') + '] ' +
      (Log.prefix ? Log.prefix:'') +
      '[' + options.level.toUpperCase() + ']' + ' '.repeat(7 - options.level.length) +
      (options.message ? options.message : '') +
      (options.meta && Object.keys(options.meta).length ? '\n\t' + JSON.stringify(options.meta) : '');
  }

  private options(options: ILoggerOptions, append: boolean = false) {
    if (append && this._options) {
      options = BaseUtils.merge(this._options, options)
    }

    this._options = _.defaults(options, DEFAULT_OPTIONS);
    Log.enable = this._options.enable;
    Log.enableEvents = this._options.events;
    let opts: LoggerOptions = {
      level: this._options.level,
      transports: []
    };


    for (let opt of options.transports) {

      let k = Object.keys(opt).shift();
      let transportOptions: TransportOptions = _.defaults(opt[k], DEFAULT_TRANSPORT_OPTIONS);

      if (!transportOptions.formatter && transportOptions['defaultFormatter']) {
        transportOptions.formatter = Log.defaultFormatter;
      }

      switch (k) {
        case 'file':
          opts.transports.push(new winston.transports.File(transportOptions));
          break;
        case 'console':
          opts.transports.push(new winston.transports.Console(transportOptions));
          break;
        case 'dailyrotatefile':
          require('winston-daily-rotate-file');
          opts.transports.push(new winston.transports.DailyRotateFile(transportOptions));
          break;
        case 'http':
          opts.transports.push(new winston.transports.Http(transportOptions));
          break;
        case 'memory':
          opts.transports.push(new winston.transports.Memory(transportOptions));
          break;
        case 'webhook':
          opts.transports.push(new winston.transports.Webhook(transportOptions));
          break;
        case 'winstonmodule':
          opts.transports.push(new winston.transports.Loggly(transportOptions));
          break;
        default:
          throw new TodoException()
      }
    }
    this.create(opts);
    return this._options
  }


  static options(options: ILoggerOptions, append: boolean = false): ILoggerOptions {
    return this._().options(options, append)
  }


  static log(level: string, ...args: any[]) {
    if (Log.enable) {
      let l = new LogEvent({args: args, level: level, prefix: this.prefix});
      if (Log.enableEvents) {
        l.fire()
      }
      this._().logger.log(level.toLocaleLowerCase(), l.message());
    }
  }

  static info(...args: any[]) {
    args.unshift('INFO');
    Log.log.apply(Log, args)
  }

  static warn(...args: any[]) {
    args.unshift('WARN');
    Log.log.apply(Log, args)
  }

  static debug(...args: any[]) {
    args.unshift('DEBUG');
    Log.log.apply(Log, args)
  }

  static error(...args: any[]) {
    args.unshift('ERROR');
    Log.log.apply(Log, args)
  }


}

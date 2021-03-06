import {Config} from "commons-config";
import {Inject} from "typedi";
import {Invoker,  Tasks} from "..";
import {Log} from '../libs/logging/Log'
import {TasksApi} from "../api/Tasks.api";


export class TaskCommand {

  @Inject('Tasks')
  tasks: Tasks;

  @Inject('Invoker')
  invoker: Invoker;

  command: string = "task";
  aliases = "t";
  describe = "Start task";


  builder(yargs: any) {
    return yargs;
  }

  async handler(argv: any) {
    let args: string[] = [];
    let start = false;


    let notask = false;

    for (let i = 0; i < process.argv.length; i++) {
      if (process.argv[i] == 'task') {
        start = true;
        continue;
      }

      if (!start) continue;

      if (process.argv[i].match(/^\-\-/)) {
        // parameter
        notask = true;
      } else {
        if (!notask) {
          args.push(process.argv[i]);
        }
      }
    }

    let res = null;

    if (args.length > 0) {
      let options: any = {
        parallel: 5,
        dry_mode: Config.get('argv.dry-mode', false)
      };

      let runner = this.tasks.runner(args, options);
      await new Promise((resolve, reject) => {
        runner.run(async (results: any) => {
          Log.info(JSON.stringify(results));
          res = results;
          resolve()
        });
      })

    } else {
      res = this.tasks.list();
      Log.info(res);


    }
    await this.invoker.use(TasksApi).onShutdown();
    return res;
  }

}

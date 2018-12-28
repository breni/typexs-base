import {IActivator} from "./api/IActivator";
import {Tasks} from "./libs/tasks/Tasks";
import {Container, Inject} from "typedi";
import {RuntimeLoader} from "./base/RuntimeLoader";


export class Activator implements IActivator{

  @Inject(RuntimeLoader.NAME)
  loader: RuntimeLoader;

  startup(): void {
    const tasks = new Tasks();
    Container.set(Tasks.NAME, tasks);

  }


}

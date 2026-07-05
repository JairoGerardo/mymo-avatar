import { NgModule } from "@angular/core"
import { AvatarDirective } from "./AvatarDirective.js"

@NgModule({
  imports: [AvatarDirective],
  exports: [AvatarDirective],
})
export class AvatarModule {}

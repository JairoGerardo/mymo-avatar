import {
  Directive, Input, Output, EventEmitter,
  type OnInit, type OnDestroy, type OnChanges, type SimpleChanges,
} from "@angular/core"
import { Avatar } from "../index.js"
import type { AvatarOptions, AvatarEvent } from "../index.js"

/**
 * Angular standalone directive that manages an Avatar instance.
 *
 * @example
 * ```html
 * <!-- app.component.html -->
 * <div mymoAvatar model="maya" position="bottom-right" (avatarLoaded)="onLoaded($event)"></div>
 * ```
 *
 * ```ts
 * import { AvatarDirective } from "@mymosdk/avatar/angular"
 *
 * @Component({ imports: [AvatarDirective], ... })
 * ```
 */
@Directive({ selector: "[mymoAvatar]", standalone: true })
export class AvatarDirective implements OnInit, OnDestroy, OnChanges {
  @Input() model?: AvatarOptions["model"]
  @Input() position?: AvatarOptions["position"]
  @Input() size?: AvatarOptions["size"]
  @Input() theme?: AvatarOptions["theme"]
  @Input() framing?: AvatarOptions["framing"]
  @Input() draggable?: AvatarOptions["draggable"]
  @Input() shadows?: AvatarOptions["shadows"]
  @Input() idle?: AvatarOptions["idle"]
  @Input() blink?: AvatarOptions["blink"]
  @Input() lipSync?: AvatarOptions["lipSync"]
  @Input() followMouse?: AvatarOptions["followMouse"]
  @Input() zIndex?: AvatarOptions["zIndex"]

  @Output() avatarLoaded = new EventEmitter<void>()
  @Output() avatarClicked = new EventEmitter<void>()
  @Output() avatarError = new EventEmitter<{ message: string }>()

  private _avatar: Avatar | null = null

  get avatar(): Avatar | null { return this._avatar }

  ngOnInit(): void {
    this._avatar = new Avatar(this._buildOptions())
    this._avatar.on("loaded", () => this.avatarLoaded.emit())
    this._avatar.on("click",  () => this.avatarClicked.emit())
    this._avatar.on("error",  (_, data) => this.avatarError.emit(data as { message: string }))
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this._avatar) return
    if (changes["model"])    this._avatar.load(this.model ?? "maya")
    if (changes["position"]) this._avatar.position(this.position ?? "bottom-right")
    if (changes["size"])     this._avatar.size(this.size ?? 180)
    if (changes["theme"])    this._avatar.setTheme(this.theme ?? "light")
    if (changes["framing"])  this._avatar.frame(this.framing ?? "full")
  }

  ngOnDestroy(): void {
    this._avatar?.destroy()
    this._avatar = null
  }

  private _buildOptions(): AvatarOptions {
    return {
      ...(this.model      !== undefined && { model:       this.model }),
      ...(this.position   !== undefined && { position:    this.position }),
      ...(this.size       !== undefined && { size:        this.size }),
      ...(this.theme      !== undefined && { theme:       this.theme }),
      ...(this.framing    !== undefined && { framing:     this.framing }),
      ...(this.draggable  !== undefined && { draggable:   this.draggable }),
      ...(this.shadows    !== undefined && { shadows:     this.shadows }),
      ...(this.idle       !== undefined && { idle:        this.idle }),
      ...(this.blink      !== undefined && { blink:       this.blink }),
      ...(this.lipSync    !== undefined && { lipSync:     this.lipSync }),
      ...(this.followMouse !== undefined && { followMouse: this.followMouse }),
      ...(this.zIndex     !== undefined && { zIndex:      this.zIndex }),
    }
  }
}

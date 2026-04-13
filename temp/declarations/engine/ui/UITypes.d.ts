import { Component } from "../core/Component";
import { Entity } from "../core/Entity";
/** Ancla de posicionamiento relativo al viewport */
export type UIAnchor = "top-left" | "top-center" | "top-right" | "center-left" | "center" | "center-right" | "bottom-left" | "bottom-center" | "bottom-right";
/** Dirección de layout para contenedores */
export type UILayoutDirection = "horizontal" | "vertical";
/** Alineación de hijos dentro de un contenedor */
export type UIAlign = "start" | "center" | "end" | "stretch";
/** Unidad de medida */
export type UIUnit = "px" | "%";
export interface UIValue {
    value: number;
    unit: UIUnit;
}
/** Padding/margin */
export interface UIEdgeInsets {
    top: number;
    right: number;
    bottom: number;
    left: number;
}
export interface UIElementComponent extends Component {
    type: "UIElement";
    elementType: "panel" | "label" | "button" | "progressBar" | "image" | "container";
    anchor: UIAnchor;
    offsetX: number;
    offsetY: number;
    width: UIValue;
    height: UIValue;
    padding: UIEdgeInsets;
    visible: boolean;
    opacity: number;
    zIndex: number;
    interactive: boolean;
    parentEntity: Entity | null;
    computedX: number;
    computedY: number;
    computedWidth: number;
    computedHeight: number;
}
export interface UIStyleComponent extends Component {
    type: "UIStyle";
    backgroundColor: string | null;
    borderColor: string | null;
    borderWidth: number;
    borderRadius: number;
    textColor: string;
    fontSize: number;
    textAlign: "left" | "center" | "right";
    fontFamily: string;
}
export interface UITextComponent extends Component {
    type: "UIText";
    content: string;
    wordWrap: boolean;
    maxLines: number;
}
export interface UIProgressBarComponent extends Component {
    type: "UIProgressBar";
    value: number;
    fillColor: string;
    trackColor: string;
    direction: "left-to-right" | "right-to-left" | "bottom-to-top" | "top-to-bottom";
}
export interface UIContainerComponent extends Component {
    type: "UIContainer";
    direction: UILayoutDirection;
    align: UIAlign;
    gap: number;
}
export interface UIButtonStateComponent extends Component {
    type: "UIButtonState";
    state: "idle" | "hovered" | "pressed" | "disabled";
    actionId: string;
    clicked: boolean;
}
export interface UIImageComponent extends Component {
    type: "UIImage";
    textureKey: string;
    scaleMode: "stretch" | "fit" | "fill" | "none";
}
export interface UIWorldAttachComponent extends Component {
    type: "UIWorldAttach";
    targetEntity: Entity;
    worldOffsetX: number;
    worldOffsetY: number;
    useCamera: boolean;
}

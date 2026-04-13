import { World } from "../core/World";
import { Entity } from "../core/Entity";
import { UIAnchor, UIValue, UIEdgeInsets } from "./UITypes";
export declare class UIFactory {
    static createLabel(world: World, config: {
        text: string;
        anchor: UIAnchor;
        offsetX?: number;
        offsetY?: number;
        fontSize?: number;
        color?: string;
        fontFamily?: string;
        zIndex?: number;
        parentEntity?: Entity | null;
    }): Entity;
    static createPanel(world: World, config: {
        anchor: UIAnchor;
        width: UIValue;
        height: UIValue;
        backgroundColor?: string;
        borderColor?: string;
        borderWidth?: number;
        borderRadius?: number;
        padding?: Partial<UIEdgeInsets>;
        zIndex?: number;
        parentEntity?: Entity | null;
    }): Entity;
    static createButton(world: World, config: {
        text: string;
        anchor: UIAnchor;
        width: UIValue;
        height: UIValue;
        actionId: string;
        backgroundColor?: string;
        textColor?: string;
        zIndex?: number;
        parentEntity?: Entity | null;
    }): Entity;
    static createProgressBar(world: World, config: {
        anchor: UIAnchor;
        width: UIValue;
        height: UIValue;
        fillColor: string;
        trackColor: string;
        initialValue?: number;
        zIndex?: number;
        parentEntity?: Entity | null;
    }): Entity;
}

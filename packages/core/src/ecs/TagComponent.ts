import { Component } from "./Component";

/** @public */
export interface TagComponent extends Component {
  type: "Tag";
  tags: string[];
}

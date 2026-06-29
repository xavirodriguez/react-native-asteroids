import { Component } from "./Component";

export interface TagComponent extends Component {
  type: "Tag";
  tags: string[];
}

import {Observable, fromEvent} from "rxjs";

class Elem {

    elem: Element;
  
    /**
    * @param svg is the parent SVG object that will host the new element
    * @param tag could be "rect", "line", "ellipse", etc.
    */
    constructor(svg: HTMLElement, tag: string, parent: Element = svg) {
        this.elem = document.createElementNS(svg.namespaceURI, tag);
        parent.appendChild(this.elem);
  }
  
  attr(name: string): string 
    attr(name: string, value: string | number): this
    attr(name: string, value?: string | number): this | string {
        if (typeof value === 'undefined') {
              return this.elem.getAttribute(name)!;
        }
        this.elem.setAttribute(name, value.toString());
        return this;
    }
    /**
    * @returns an Observable for the specified event on this element
    */
    observe<T extends Event>(event: string): Observable<T> {
        return fromEvent<T>(this.elem, event);
    }
  }
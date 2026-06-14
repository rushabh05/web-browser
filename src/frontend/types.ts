export interface LayoutBox {
  element: any;
  x: number;
  y: number;
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
  margin: { top: number; right: number; bottom: number; left: number };
  border: { top: number; right: number; bottom: number; left: number };
  display: string;
  backgroundColor?: string;
  color?: string;
  fontSize?: string | number;
  fontWeight?: string;
  textAlign?: string;
  children: LayoutBox[];
}

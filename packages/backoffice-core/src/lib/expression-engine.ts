import { create, all } from "mathjs";
import { FUNCTION_REGISTRY } from "./function-registry";

export const math = create(all);

FUNCTION_REGISTRY.forEach((fn) => {
  if (fn.implementation && !fn.isMathjsBuiltin) {
    math.import(
      {
        [fn.name]: fn.implementation,
      },
      { override: true },
    );
  }
});

export class ExpressionEngine {
  private static instance: ExpressionEngine;

  private constructor() {}

  public static getInstance(): ExpressionEngine {
    if (!ExpressionEngine.instance) {
      ExpressionEngine.instance = new ExpressionEngine();
    }
    return ExpressionEngine.instance;
  }

  private buildScope(data: any[]): Record<string, number[]> {
    const scope: Record<string, number[]> = {};
    if (data.length === 0) return scope;

    const isGrouped = Array.isArray(data[0]);
    const flatData = isGrouped ? (data as any[][]).flat() : data;

    if (flatData.length === 0) return scope;

    const keys = Object.keys(flatData[0]);
    keys.forEach((key) => {
      scope[key] = flatData.map((row) => {
        const val = row[key];
        return typeof val === "number" ? val : 0;
      });
    });

    return scope;
  }

  public evaluateSeries(expression: string, data: any[]): number[] {
    if (!expression || !data || data.length === 0) return data.map(() => 0);

    try {
      const scope = this.buildScope(data);

      const result = math.evaluate(expression, scope);

      if (Array.isArray(result)) {
        return result.map((v) => (Number.isFinite(v) ? v : 0));
      }

      if (typeof result === "number") {
        const scalar = Number.isFinite(result) ? result : 0;
        return data.map(() => scalar);
      }

      if (result && typeof result.toArray === "function") {
        return result.toArray().map((v: any) => (Number.isFinite(v) ? v : 0));
      }

      return data.map(() => 0);
    } catch (error) {
      console.error("Vector evaluation error:", error);
      if (data[0] && data[0][expression] !== undefined) {
        return data.map((row) => Number(row[expression]) || 0);
      }
      return data.map(() => 0);
    }
  }

  public getVariables(expression: string): string[] {
    try {
      const node = math.parse(expression);
      const variables: string[] = [];
      node.traverse((n: any) => {
        if (n.isSymbolNode && !(math as any)[n.name] && !FUNCTION_REGISTRY.some((f) => f.name === n.name)) {
          variables.push(n.name);
        }
      });
      return Array.from(new Set(variables));
    } catch {
      return [];
    }
  }
}

export const expressionEngine = ExpressionEngine.getInstance();
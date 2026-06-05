import * as t from '@babel/types';

export type PropAnalysis = {
  key: string;
  defaultValue: t.Expression | null;
};

export type RefBinding = {
  name: string;
  hookIndex: number;
};

export type HookUsage = {
  useEffect: boolean;
  useEvent: boolean;
};

export type ComponentAnalysis = {
  name: string;
  declaration: t.Statement;
  props: PropAnalysis[];
  refBindings: RefBinding[];
  hookUsage: HookUsage;
};

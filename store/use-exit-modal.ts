import {create} from "zustand";
// 2. 定义TypeScript接口ExitModalState，约束退出弹窗的状态和方法类型（类型校验）
type ExitModalState = {
  isOpen: boolean;// 状态：标识弹窗是否打开，布尔类型
  open: () => void;// 方法：打开弹窗，无入参、无返回值
  close: () => void;// 方法：关闭弹窗，无入参、无返回值
}
//创建并导出自定义hooks useExitModal，作为全局使用的状态入口
// create方法传入一个回调函数，回调接收set方法（用于修改状态），返回状态仓库的初始值和方法
export const useExitModal = create<ExitModalState>((set) => ({
  // 初始状态：弹窗默认关闭
  isOpen: false,
  // 打开弹窗的方法：调用set方法修改isOpen为true
  open: () => set({ isOpen: true }),
  // 关闭弹窗的方法：调用set方法修改isOpen为false
  close: () => set({ isOpen: false }),
}));

//为什么选择Zustand ，相比 Redux 有什么优势？
//Zustand 是一个轻量级的状态管理库，提供了简单的 API 和更好的性能。相比 Redux，Zustand 不需要编写大量的样板代码（如 action types、action creators、reducers），使得开发更加高效和简洁。此外，Zustand 采用了基于 hooks 的设计，更符合现代 React 的开发方式，能够更方便地在组件中使用和共享状态。

//Zustand 的create方法返回的是一个 React Hooks，它的执行原理是什么？为什么能在任意组件中使用且状态全局共享？
//Zustand 的 create 方法返回一个自定义 Hook，这个 Hook 内部使用了 React 的 useState 和 useEffect 来管理状态。当你调用这个 Hook 时，它会返回当前的状态和修改状态的方法。由于 Zustand 使用了 React 的 Context API 来存储状态，所以无论在哪个组件中调用这个 Hook，都能访问到同一个状态实例，实现了全局共享。这种设计使得 Zustand 非常适合在大型应用中管理复杂的状态，同时保持代码的简洁和易维护。
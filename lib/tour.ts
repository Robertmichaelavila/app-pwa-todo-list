import type { DriveStep } from "driver.js";

export const tourDriverOptions = {
  animate: true,
  smoothScroll: true,
  showProgress: true,
  progressText: "{{current}} de {{total}}",
  nextBtnText: "Próximo",
  prevBtnText: "Anterior",
  doneBtnText: "Concluir",
  closeBtnLabel: "Fechar",
} as const;

const tourSteps = [
  {
    element: "#tour-intro",
    popover: {
      title: "Tarefas neste aparelho",
      description: "A lista fica salva aqui, mesmo sem internet.",
      side: "bottom",
    },
  },
  {
    element: "#task-title",
    popover: {
      title: "Nova tarefa",
      description: "Escreva o que você precisa fazer.",
      side: "bottom",
    },
  },
  {
    element: "#tour-add",
    popover: {
      title: "Salvar",
      description: "Toque em Adicionar para guardar a tarefa.",
      side: "bottom",
    },
  },
  {
    element: "#tour-list",
    popover: {
      title: "Sua lista",
      description: "Conclua ou exclua cada item por aqui.",
      side: "top",
    },
  },
  {
    element: "#tour-status",
    popover: {
      title: "Uso offline",
      description: "Veja a conexão e instale o aplicativo.",
      side: "top",
    },
  },
] as const satisfies readonly DriveStep[];

export function visibleTourSteps(
  isRendered: (selector: string) => boolean,
): DriveStep[] {
  return tourSteps.filter(
    (step) => typeof step.element === "string" && step.element.length > 0 && isRendered(step.element),
  );
}

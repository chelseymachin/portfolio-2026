import { ref } from 'vue'

export type View = 'work' | 'quests'

const currentView = ref<View>('work')

export function useView() {
  function setView(view: View) {
    currentView.value = view
  }

  return {
    currentView,
    setView,
  }
}
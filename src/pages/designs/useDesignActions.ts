import { useCallback, useEffect, useRef } from "react";
import { errorMessage } from "../../api/client";
import { deleteSavedDesign, duplicateSavedDesign, updateSavedDesign, type SavedDesign } from "../../api/designs";
import i18n from "../../i18n";
import { useToast } from "../../studio/Toasts";

type SetList = (update: (list: SavedDesign[] | undefined) => SavedDesign[]) => void;

/** How long "Undo" is offered after a delete; the design is only deleted on the server after it. */
export const UNDO_MS = 5000;
export const NAME_MAX = 60;

/**
 * Rename, duplicate and delete for My designs, updating the list straight away.
 *
 * The API deletes for good (there is no soft delete), so a delete is held back for UNDO_MS:
 * the design disappears at once, "Undo" puts it back where it was, and only when the time is
 * up is it deleted on the server. Leaving the page sends any held-back delete immediately.
 */
export function useDesignActions(setList: SetList) {
  const toast = useToast();
  const pending = useRef(new Map<string, { timer: number; saved: SavedDesign }>());

  const commit = useCallback(
    async (saved: SavedDesign, index: number) => {
      pending.current.delete(saved.id);
      try {
        await deleteSavedDesign(saved.id);
      } catch (e) {
        setList((list = []) => insertAt(list, saved, index));
        toast(errorMessage(e));
      }
    },
    [setList, toast],
  );

  // Leaving the page: held-back deletes are sent now instead of being lost.
  useEffect(() => {
    const map = pending.current;
    const flush = () => {
      for (const [id, { timer }] of map) {
        window.clearTimeout(timer);
        void deleteSavedDesign(id).catch(() => {});
      }
      map.clear();
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  const rename = async (saved: SavedDesign, name: string) => {
    const value = name.trim().slice(0, NAME_MAX);
    if (!value || value === saved.name) return true;
    setList((list = []) => list.map((s) => (s.id === saved.id ? { ...s, name: value } : s)));
    try {
      const updated = await updateSavedDesign(saved.id, { name: value });
      setList((list = []) => list.map((s) => (s.id === saved.id ? updated : s)));
      toast(i18n.t("designs.renamed"));
      return true;
    } catch (e) {
      setList((list = []) => list.map((s) => (s.id === saved.id ? { ...s, name: saved.name } : s)));
      toast(errorMessage(e));
      return false;
    }
  };

  const duplicate = async (saved: SavedDesign) => {
    try {
      const copy = await duplicateSavedDesign(saved.id, i18n.t("designs.copyName", { name: saved.name }).slice(0, 200));
      setList((list = []) => [copy, ...list]);
      toast(i18n.t("designs.duplicated", { name: copy.name }));
    } catch (e) {
      toast(errorMessage(e));
    }
  };

  const remove = (saved: SavedDesign, index: number) => {
    setList((list = []) => list.filter((s) => s.id !== saved.id));
    const timer = window.setTimeout(() => void commit(saved, index), UNDO_MS);
    pending.current.set(saved.id, { timer, saved });
    toast(i18n.t("designs.deleted", { name: saved.name }), {
      duration: UNDO_MS,
      action: {
        label: i18n.t("designs.undo"),
        onClick: () => {
          const held = pending.current.get(saved.id);
          if (!held) return;
          window.clearTimeout(held.timer);
          pending.current.delete(saved.id);
          setList((list = []) => insertAt(list, saved, index));
        },
      },
    });
  };

  return { rename, duplicate, remove };
}

function insertAt(list: SavedDesign[], saved: SavedDesign, index: number) {
  if (list.some((s) => s.id === saved.id)) return list;
  const copy = list.slice();
  copy.splice(Math.min(index, copy.length), 0, saved);
  return copy;
}

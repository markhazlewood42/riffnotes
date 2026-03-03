let idCounter = 0;
function generateId() {
  idCounter += 1;
  return 'ann-' + Date.now().toString(36) + '-' + idCounter.toString(36);
}

const initialState = {
  annotations: {},
  songId: null,
};

function annotationReducer(state, action) {
  switch (action.type) {
    case 'ADD_CHORD': {
      const id = generateId();
      return {
        ...state,
        annotations: {
          ...state.annotations,
          [id]: { id, type: 'chord', ...action.payload },
        },
      };
    }
    case 'ADD_RIGHT_NOTE': {
      const id = generateId();
      return {
        ...state,
        annotations: {
          ...state.annotations,
          [id]: { id, type: 'right-side', style: 'default', ...action.payload },
        },
      };
    }
    case 'UPDATE_ANNOTATION': {
      const { id, changes } = action.payload;
      if (!state.annotations[id]) return state;
      return {
        ...state,
        annotations: {
          ...state.annotations,
          [id]: { ...state.annotations[id], ...changes },
        },
      };
    }
    case 'DELETE_ANNOTATION': {
      const { id } = action.payload;
      const { [id]: _, ...rest } = state.annotations;
      return { ...state, annotations: rest };
    }
    case 'DELETE_ANNOTATIONS_FOR_LINE': {
      const { lineId } = action.payload;
      const filtered = {};
      for (const [id, ann] of Object.entries(state.annotations)) {
        if (ann.lineId !== lineId) {
          filtered[id] = ann;
        }
      }
      return { ...state, annotations: filtered };
    }
    case 'REMAP_LINE_IDS': {
      // mapping is { oldLineId: newLineId }
      const { mapping } = action.payload;
      const remapped = {};
      for (const [id, ann] of Object.entries(state.annotations)) {
        if (mapping[ann.lineId]) {
          remapped[id] = { ...ann, lineId: mapping[ann.lineId] };
        } else {
          remapped[id] = ann;
        }
      }
      return { ...state, annotations: remapped };
    }
    case 'LOAD': {
      return action.payload;
    }
    default:
      return state;
  }
}

// Selectors
function getAnnotationsForLine(state, lineId) {
  return Object.values(state.annotations).filter((a) => a.lineId === lineId);
}

function getChordsForLine(state, lineId) {
  return Object.values(state.annotations).filter(
    (a) => a.type === 'chord' && a.lineId === lineId
  );
}

function getRightNoteForLine(state, lineId) {
  return Object.values(state.annotations).find(
    (a) => a.type === 'right-side' && a.lineId === lineId
  );
}

export {
  annotationReducer,
  initialState,
  getAnnotationsForLine,
  getChordsForLine,
  getRightNoteForLine,
};

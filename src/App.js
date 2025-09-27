import React, { useState, useEffect } from 'react';
import './index.css';
import { saveActionData, loadActionData, testSupabaseConnection } from './supabase';

function App() {
  const [actions, setActions] = useState([]);
  const [newActionName, setNewActionName] = useState('');
  const [isAddingAction, setIsAddingAction] = useState(false);
  const [draggedPill, setDraggedPill] = useState(null);
  const [selectedActionId, setSelectedActionId] = useState(null);
  const [actionBoards, setActionBoards] = useState({}); // Store boards for each action
  const [submittedDescriptions, setSubmittedDescriptions] = useState({}); // Store submitted descriptions per pill
  const [showInputForms, setShowInputForms] = useState({}); // Track which input forms to show (per pill)
  const [rowNames, setRowNames] = useState({}); // Store row names
  const [editingRowName, setEditingRowName] = useState(null); // Track which row name is being edited
  const [activatedActions, setActivatedActions] = useState({}); // Track which red actions are activated
  const [clickedPillType, setClickedPillType] = useState({}); // Track which pill type was clicked for each row
  const [activatedPills, setActivatedPills] = useState({}); // Track which pill is activated in each row
  const [pillInputValues, setPillInputValues] = useState({}); // Track input values for each pill
  const [showVideoModal, setShowVideoModal] = useState(false); // Track video recording modal visibility
  const [isRecording, setIsRecording] = useState(false); // Track recording status
  const [mediaRecorder, setMediaRecorder] = useState(null); // Store MediaRecorder instance
  const [recordedVideo, setRecordedVideo] = useState(null); // Store recorded video blob
  const [currentRowId, setCurrentRowId] = useState(null); // Track which row is recording
  const [rowVideos, setRowVideos] = useState({}); // Store recorded videos for each row
  const [minimizedRows, setMinimizedRows] = useState({}); // Track which rows are minimized
  const [liveStream, setLiveStream] = useState(null); // Store live video stream for preview
  const [voiceInputs, setVoiceInputs] = useState({}); // Store voice input values for each row
  const [flippedCards, setFlippedCards] = useState({}); // Track which cards are flipped
  const [actionInputs, setActionInputs] = useState({}); // Store action input values for each card
  const [frontInputs, setFrontInputs] = useState({}); // Store front side input values for each card
  const [backInputs, setBackInputs] = useState({}); // Store back side input values for each card

  // Test Supabase connection on app load
  useEffect(() => {
    testSupabaseConnection();
  }, []);

  const handleAddAction = () => {
    if (newActionName.trim()) {
      const newAction = {
        id: Date.now(),
        name: newActionName.trim(),
        color: ['bg-pink-500', 'bg-slate-500', 'bg-indigo-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500', 'bg-red-500', 'bg-purple-500'][Math.floor(Math.random() * 8)]
      };
      setActions([...actions, newAction]);
      // Initialize empty board for new action
      setActionBoards(prev => ({
        ...prev,
        [newAction.id]: []
      }));
      setNewActionName('');
      setIsAddingAction(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAddAction();
    } else if (e.key === 'Escape') {
      setIsAddingAction(false);
      setNewActionName('');
    }
  };

  const handleDescriptionKeyPress = (e, rowId) => {
    if (e.key === 'Enter') {
      // Find which pill type is currently active for this row
      const activePillType = activatedPills[rowId];
      if (activePillType) {
        submitDescription(rowId, activePillType);
      }
    } else if (e.key === 'Escape') {
      // Hide all input forms for this row on Escape
      setShowInputForms(prev => {
        const newForms = { ...prev };
        Object.keys(newForms).forEach(key => {
          if (key.startsWith(`${rowId}-`)) {
            delete newForms[key];
          }
        });
        return newForms;
      });
    }
  };

  const handleDragStart = (e, pillType) => {
    setDraggedPill(pillType);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, rowIndex) => {
    e.preventDefault();
    if (draggedPill && selectedActionId) {
      const newRow = {
        id: Date.now(),
        pills: [draggedPill, 'ActionRed'], // Always add red Action pill next to the dropped pill
        position: rowIndex,
        description: '', // Add description field
        showInput: true, // Show input form by default for new rows
        name: `Untitled ${(actionBoards[selectedActionId] || []).length + 1}` // Default name
      };
      
      const currentBoard = actionBoards[selectedActionId] || [];
      let newBoard;
      
      if (rowIndex === -1) {
        // Add to end
        newBoard = [...currentBoard, newRow];
      } else {
        // Insert at specific position
        newBoard = [...currentBoard];
        newBoard.splice(rowIndex, 0, newRow);
      }
      
      setActionBoards(prev => ({
        ...prev,
        [selectedActionId]: newBoard
      }));
      
      // Initially activate the dropped pill (not the red Action pill)
      setActivatedPills(prev => ({
        ...prev,
        [newRow.id]: draggedPill
      }));
      
      // Set the clicked pill type for the input form
      setClickedPillType(prev => ({
        ...prev,
        [newRow.id]: draggedPill
      }));
      
      // Show input form for the dropped pill
      setShowInputForms(prev => ({
        ...prev,
        [`${newRow.id}-${draggedPill}`]: true
      }));
    }
    setDraggedPill(null);
  };

  const updatePillInputValue = (rowId, pillType, value) => {
    setPillInputValues(prev => ({
      ...prev,
      [`${rowId}-${pillType}`]: value
    }));
  };

  const submitDescription = (rowId, pillType) => {
    const pillKey = `${rowId}-${pillType}`;
    const inputValue = pillInputValues[pillKey];
    
    if (inputValue && inputValue.trim()) {
      // Save the description for this specific pill
      setSubmittedDescriptions(prev => ({
        ...prev,
        [pillKey]: inputValue.trim()
      }));
      
      // Clear the input value
      setPillInputValues(prev => ({
        ...prev,
        [pillKey]: ''
      }));
      
      // If this is not the red Action pill, switch to it
      if (pillType !== 'ActionRed') {
        // Switch activation to the red Action pill after submission
        setActivatedPills(prev => ({
          ...prev,
          [rowId]: 'ActionRed'
        }));
        
        // Activate the red Action pill
        setActivatedActions(prev => ({
          ...prev,
          [rowId]: true
        }));
        
        // Hide the current input form and show input form for red Action pill
        setShowInputForms(prev => {
          const newForms = { ...prev };
          // Hide all input forms for this row
          Object.keys(newForms).forEach(key => {
            if (key.startsWith(`${rowId}-`)) {
              delete newForms[key];
            }
          });
          // Show input form for red Action pill
          newForms[`${rowId}-ActionRed`] = true;
          return newForms;
        });
        
        // Set the clicked pill type to ActionRed for the input form
        setClickedPillType(prev => ({
          ...prev,
          [rowId]: 'ActionRed'
        }));
      } else {
        // If it's the red Action pill, save to Supabase and minimize
        const currentBoard = actionBoards[selectedActionId] || [];
        const currentRow = currentBoard.find(row => row.id === rowId);
        
        if (currentRow) {
          // Prepare data for Supabase
          const actionData = {
            title: currentRow.name || `Untitled ${currentBoard.indexOf(currentRow) + 1}`,
            pills: currentRow.pills,
            descriptions: {
              ...submittedDescriptions,
              [pillKey]: inputValue.trim()
            }
          };
          
          // Save to Supabase
          saveToSupabase(rowId, actionData);
          
          // Minimize the container after saving
          setMinimizedRows(prev => ({
            ...prev,
            [rowId]: true
          }));
        }
        
        // Hide the input form
        setShowInputForms(prev => {
          const newForms = { ...prev };
          delete newForms[pillKey];
          return newForms;
        });
      }
    }
  };

  const handleActionClick = (rowId) => {
    const pillKey = `${rowId}-ActionRed`;
    const submittedDescription = submittedDescriptions[pillKey];
    
    // Toggle activation state
    setActivatedActions(prev => ({
      ...prev,
      [rowId]: !prev[rowId]
    }));
    
    // Also update the activatedPills state for consistency
    setActivatedPills(prev => ({
      ...prev,
      [rowId]: activatedActions[rowId] ? null : 'ActionRed'
    }));
    
    if (submittedDescription) {
      // Show the input form with the submitted text
      setShowInputForms(prev => {
        const newForms = { ...prev };
        // Hide all other input forms for this row
        Object.keys(newForms).forEach(key => {
          if (key.startsWith(`${rowId}-`)) {
            delete newForms[key];
          }
        });
        // Show input form for red Action pill
        newForms[pillKey] = true;
        return newForms;
      });
      // Set the input value to the submitted text
      setPillInputValues(prev => ({
        ...prev,
        [pillKey]: submittedDescription
      }));
    } else {
      // Show the input form for new description
      setShowInputForms(prev => {
        const newForms = { ...prev };
        // Hide all other input forms for this row
        Object.keys(newForms).forEach(key => {
          if (key.startsWith(`${rowId}-`)) {
            delete newForms[key];
          }
        });
        // Show input form for red Action pill
        newForms[pillKey] = true;
        return newForms;
      });
    }
  };

  const handlePillClick = (rowId, pillType) => {
    // Check if this pill is already activated
    const isCurrentlyActivated = activatedPills[rowId] === pillType;
    
    // Set the clicked pill type for this row
    setClickedPillType(prev => ({
      ...prev,
      [rowId]: pillType
    }));
    
    // Toggle the activated pill for this row
    setActivatedPills(prev => ({
      ...prev,
      [rowId]: isCurrentlyActivated ? null : pillType
    }));
    
    // Show/hide the input form for this specific pill
    setShowInputForms(prev => {
      const newForms = { ...prev };
      const pillKey = `${rowId}-${pillType}`;
      
      if (isCurrentlyActivated) {
        // Hide the input form if deactivating
        delete newForms[pillKey];
      } else {
        // Hide all other input forms for this row and show this one
        Object.keys(newForms).forEach(key => {
          if (key.startsWith(`${rowId}-`)) {
            delete newForms[key];
          }
        });
        newForms[pillKey] = true;
        
        // If there's a submitted description for this pill, load it into the input
        const submittedDescription = submittedDescriptions[pillKey];
        if (submittedDescription) {
          setPillInputValues(prev => ({
            ...prev,
            [pillKey]: submittedDescription
          }));
        }
      }
      return newForms;
    });
  };

  const removeRow = (rowId) => {
    if (selectedActionId) {
      const currentBoard = actionBoards[selectedActionId] || [];
      const newBoard = currentBoard.filter(row => row.id !== rowId);
      setActionBoards(prev => ({
        ...prev,
        [selectedActionId]: newBoard
      }));
    }
  };

  const deleteBoard = (boardId) => {
    // Remove the board from actions list
    setActions(actions.filter(action => action.id !== boardId));
    
    // Remove the board's data from actionBoards
    setActionBoards(prev => {
      const newBoards = { ...prev };
      delete newBoards[boardId];
      return newBoards;
    });
    
    // Clear submitted descriptions for this board
    setSubmittedDescriptions(prev => {
      const newDescriptions = { ...prev };
      Object.keys(newDescriptions).forEach(key => {
        if (key.startsWith(`${boardId}-`)) {
          delete newDescriptions[key];
        }
      });
      return newDescriptions;
    });
    
    // Clear pill input values for this board
    setPillInputValues(prev => {
      const newInputValues = { ...prev };
      Object.keys(newInputValues).forEach(key => {
        if (key.startsWith(`${boardId}-`)) {
          delete newInputValues[key];
        }
      });
      return newInputValues;
    });
    
    // Clear showInputForms for this board
    setShowInputForms(prev => {
      const newForms = { ...prev };
      Object.keys(newForms).forEach(key => {
        if (key.startsWith(`${boardId}-`)) {
          delete newForms[key];
        }
      });
      return newForms;
    });
    
    // Clear clickedPillType for this board
    setClickedPillType(prev => {
      const newPillTypes = { ...prev };
      Object.keys(newPillTypes).forEach(key => {
        if (key.startsWith(boardId.toString())) {
          delete newPillTypes[key];
        }
      });
      return newPillTypes;
    });
    
    // Clear activatedPills for this board
    setActivatedPills(prev => {
      const newActivatedPills = { ...prev };
      Object.keys(newActivatedPills).forEach(key => {
        if (key.startsWith(boardId.toString())) {
          delete newActivatedPills[key];
        }
      });
      return newActivatedPills;
    });
    
    // Clear row videos for this board
    setRowVideos(prev => {
      const newRowVideos = { ...prev };
      Object.keys(newRowVideos).forEach(key => {
        if (key.startsWith(boardId.toString())) {
          delete newRowVideos[key];
        }
      });
      return newRowVideos;
    });
    
    // If the deleted board was selected, clear selection
    if (selectedActionId === boardId) {
      setSelectedActionId(null);
    }
  };

  const selectAction = (actionId) => {
    setSelectedActionId(actionId);
  };

  const updateRowName = (rowId, newName) => {
    if (selectedActionId) {
      const currentBoard = actionBoards[selectedActionId] || [];
      const newBoard = currentBoard.map(row => 
        row.id === rowId ? { ...row, name: newName } : row
      );
      setActionBoards(prev => ({
        ...prev,
        [selectedActionId]: newBoard
      }));
    }
  };

  const handleNameKeyPress = (e, rowId) => {
    if (e.key === 'Enter') {
      setEditingRowName(null);
    } else if (e.key === 'Escape') {
      setEditingRowName(null);
    }
  };

  const openVideoModal = (rowId) => {
    setCurrentRowId(rowId);
    setShowVideoModal(true);
    setRecordedVideo(null);
  };

  const closeVideoModal = () => {
    setShowVideoModal(false);
    setCurrentRowId(null);
    setIsRecording(false);
    setRecordedVideo(null);
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    // Clean up live stream
    if (liveStream) {
      liveStream.getTracks().forEach(track => track.stop());
      setLiveStream(null);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: false 
      });
      
      // Store the stream for live preview
      setLiveStream(stream);
      
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        setRecordedVideo(blob);
        // Don't stop the stream here, let it continue for preview
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const saveRecording = () => {
    if (recordedVideo && currentRowId) {
      // Store the video for this row
      setRowVideos(prev => ({
        ...prev,
        [currentRowId]: recordedVideo
      }));
      
      // Clean up live stream before closing
      if (liveStream) {
        liveStream.getTracks().forEach(track => track.stop());
        setLiveStream(null);
      }
      
      closeVideoModal();
    }
  };

  const toggleMinimize = (rowId) => {
    setMinimizedRows(prev => ({
      ...prev,
      [rowId]: !prev[rowId]
    }));
  };

  const updateVoiceInput = (rowId, field, value) => {
    setVoiceInputs(prev => ({
      ...prev,
      [rowId]: {
        ...prev[rowId],
        [field]: value
      }
    }));
  };

  const toggleCardFlip = (rowId) => {
    setFlippedCards(prev => ({
      ...prev,
      [rowId]: !prev[rowId]
    }));
  };

  const updateActionInput = (rowId, value) => {
    setActionInputs(prev => ({
      ...prev,
      [rowId]: value
    }));
  };

  const updateFrontInput = (rowId, value) => {
    setFrontInputs(prev => ({
      ...prev,
      [rowId]: value
    }));
  };

  const updateBackInput = (rowId, value) => {
    setBackInputs(prev => ({
      ...prev,
      [rowId]: value
    }));
  };

  const handleActionInputKeyPress = (e, rowId) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const actionText = actionInputs[rowId];
      if (actionText && actionText.trim()) {
        // Save the action text (you can modify this to save to Supabase or wherever needed)
        console.log('Saving action text:', actionText);
        // For now, just show an alert - you can replace this with actual save logic
        alert(`Action saved: "${actionText}"`);
      }
    }
  };

  const handleFrontInputKeyPress = (e, rowId) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const frontText = frontInputs[rowId];
      if (frontText && frontText.trim()) {
        console.log('Saving front input:', frontText);
        alert(`Front input saved: "${frontText}"`);
      }
    }
  };

  const handleBackInputKeyPress = (e, rowId) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const backText = backInputs[rowId];
      if (backText && backText.trim()) {
        console.log('Saving back input:', backText);
        alert(`Back input saved: "${backText}"`);
      }
    }
  };

  const saveToSupabase = async (rowId, actionData) => {
    console.log('Attempting to save to Supabase:', { rowId, actionData });
    try {
      const result = await saveActionData(actionData);
      if (result.success) {
        console.log('Successfully saved to Supabase:', result.data);
        alert('Data saved to Supabase successfully!');
      } else {
        console.error('Failed to save to Supabase:', result.error);
        alert('Failed to save to Supabase: ' + result.error);
      }
    } catch (error) {
      console.error('Error saving to Supabase:', error);
      alert('Error saving to Supabase: ' + error.message);
    }
  };

  const saveActionToAction = (rowId) => {
    if (!selectedActionId) {
      alert('Please select a board first');
      return;
    }

    const currentBoard = actionBoards[selectedActionId] || [];
    const currentRow = currentBoard.find(row => row.id === rowId);
    
    if (!currentRow) {
      alert('Row not found');
      return;
    }

    // Check if there are any submitted descriptions for this row
    const rowDescriptions = Object.keys(submittedDescriptions).filter(key => key.startsWith(`${rowId}-`));
    const hasDescriptions = rowDescriptions.length > 0;
    
    if (!hasDescriptions) {
      alert('Please add descriptions to your action before saving');
      return;
    }

    // Prepare data for Supabase - include all descriptions like the existing functionality
    const actionData = {
      title: currentRow.name || `Untitled ${currentBoard.indexOf(currentRow) + 1}`,
      pills: currentRow.pills,
      descriptions: submittedDescriptions // Include all descriptions like the existing save functionality
    };
    
    // Save to Supabase
    saveToSupabase(rowId, actionData);
    
    // Minimize the container after saving
    setMinimizedRows(prev => ({
      ...prev,
      [rowId]: true
    }));
  };

  const submitVoiceInput = (rowId) => {
    const voiceData = voiceInputs[rowId];
    if (voiceData && voiceData.speech && voiceData.action) {
      // Store the voice data (you can modify this to store it differently)
      setSubmittedDescriptions(prev => ({
        ...prev,
        [`${rowId}-Voice`]: `${voiceData.speech} -> ${voiceData.action}`
      }));
      
      // Get the current row data
      const currentBoard = actionBoards[selectedActionId] || [];
      const currentRow = currentBoard.find(row => row.id === rowId);
      
      if (currentRow) {
        // Prepare data for Supabase
        const actionData = {
          title: currentRow.name || `Untitled ${currentBoard.indexOf(currentRow) + 1}`,
          pills: currentRow.pills,
          descriptions: {
            ...submittedDescriptions,
            [`${rowId}-Voice`]: `${voiceData.speech} -> ${voiceData.action}`
          }
        };
        
        // Save to Supabase
        saveToSupabase(rowId, actionData);
      }
      
      // Clear the voice inputs
      setVoiceInputs(prev => {
        const newInputs = { ...prev };
        delete newInputs[rowId];
        return newInputs;
      });
      
      // Minimize the container after saving
      setMinimizedRows(prev => ({
        ...prev,
        [rowId]: true
      }));
    }
  };

  return (
    <div className="flex">
      <aside className="flex flex-col w-64 min-h-screen px-5 py-8 overflow-y-auto bg-gray-50/80 border-r border-gray-200 rtl:border-r-0 rtl:border-l">
        <a href="#" className="text-3xl font-bold text-gray-800 hover:text-gray-600 transition-colors">
          &lt;A2A&gt;
        </a>

        <hr className="my-6 border-gray-200" />

        <div className="flex flex-col flex-1">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-800">Boards</h2>
              <button 
                onClick={() => setIsAddingAction(true)}
                className="p-0.5 hover:bg-gray-200 duration-200 transition-colors text-gray-500 border border-gray-300 rounded-lg"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
            </div>

            <nav className="mt-4 -mx-3 space-y-3 ">
              {isAddingAction && (
                <div className="px-3 py-2">
                  <input
                    type="text"
                    value={newActionName}
                    onChange={(e) => setNewActionName(e.target.value)}
                    onKeyDown={handleKeyPress}
                    onBlur={handleAddAction}
                    placeholder="Enter board name..."
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                </div>
              )}
              
              {actions.length === 0 && !isAddingAction && (
                <div className="px-3 py-4 text-center text-gray-500 text-xs">
                  No boards yet. Click the + button to add one.
                </div>
              )}

              {actions.map((action, index) => (
                <div key={action.id} className="group relative">
                  <button 
                    onClick={() => selectAction(action.id)}
                    className={`flex items-center justify-between w-full px-3 py-2 text-xs font-medium transition-colors duration-300 transform rounded-lg hover:bg-gray-200 hover:text-gray-800 ${
                      selectedActionId === action.id 
                        ? 'bg-gray-200 text-gray-800' 
                        : 'text-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-x-2">
                      <span className={`w-2 h-2 rounded-full ${action.color}`}></span>
                      <span>{action.name}</span>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4 rtl:rotate-180">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Are you sure you want to delete "${action.name}"?`)) {
                        deleteBoard(action.id);
                      }
                    }}
                    className="absolute right-8 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-red-500 hover:text-red-700 p-1"
                    title="Delete board"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              ))}
            </nav>
          </div>
        </div>
      </aside>
      
      {/* Main content area */}
      <main className="flex-1 p-8 bg-white grid-background">
        <div className="justify-center my-8 select-none flex">
          <button 
            draggable
            onDragStart={(e) => handleDragStart(e, 'Action')}
            className="py-2 px-4 shadow-md no-underline rounded-full bg-transparent text-gray-700 font-sans font-semibold text-sm border border-gray-300 btn-primary hover:text-gray-800 hover:bg-gray-50 focus:outline-none active:shadow-none mr-2 cursor-move"
          >
            Action
          </button>
          <button 
            draggable
            onDragStart={(e) => handleDragStart(e, 'Eye tracking')}
            className="py-2 px-4 shadow-md no-underline rounded-full bg-transparent text-gray-700 font-sans font-semibold text-sm border border-gray-300 btn-primary hover:text-gray-800 hover:bg-gray-50 focus:outline-none active:shadow-none mr-2 cursor-move"
          >
            Eye tracking
          </button>
          <button 
            draggable
            onDragStart={(e) => handleDragStart(e, 'Voice')}
            className="py-2 px-4 shadow-md no-underline rounded-full bg-transparent text-gray-700 font-sans font-semibold text-sm border border-gray-300 btn-primary hover:text-gray-800 hover:bg-gray-50 focus:outline-none active:shadow-none cursor-move"
          >
            Voice
          </button>
        </div>

        {/* Drop zones and cards */}
        {selectedActionId ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {(() => {
              const currentBoard = actionBoards[selectedActionId] || [];
              return (
                <>
                  {/* Render all existing cards */}
                  {currentBoard.map((row, index) => (
                  <div key={row.id} className="relative">
                    <div 
                      className={`card ${flippedCards[row.id] ? 'flipped' : ''} ${
                        row.pills.includes('Action') && row.pills.includes('ActionRed') ? 'action-action-card' :
                        row.pills.includes('Voice') ? 'voice-card' :
                        row.pills.includes('Eye tracking') ? 'eye-tracking-card' : ''
                      }`}
                      onClick={() => toggleCardFlip(row.id)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index)}
                    >
                        <div className="card-inner">
                          <div className="card-front">
                            <div className="absolute top-2 right-2 flex space-x-1 z-10">
                              {row.pills.map((pillType, pillIndex) => {
                                // Red Action pill is solid colored on front
                                const isRedActionPill = pillType === 'ActionRed';
                                return (
                                <button
                                    key={pillIndex}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                      if (isRedActionPill) {
                                        // Red pill shows back
                                        setFlippedCards(prev => ({ ...prev, [row.id]: true }));
                                      } else {
                                        // Other pill shows front
                                        setFlippedCards(prev => ({ ...prev, [row.id]: false }));
                                      }
                                    }}
                                    className={`py-0.5 px-2 rounded-full text-xs font-medium border cursor-pointer transition-colors ${
                                      isRedActionPill 
                                        ? 'bg-transparent text-gray-400 border-gray-300 hover:bg-gray-100'
                                        : pillType === 'Action' ? 'bg-blue-500 text-white border-blue-500 hover:bg-blue-600' :
                                          pillType === 'Eye tracking' ? 'bg-cyan-500 text-white border-cyan-500 hover:bg-cyan-600' :
                                          pillType === 'Voice' ? 'bg-sky-500 text-white border-sky-500 hover:bg-sky-600' :
                                          'bg-blue-500 text-white border-blue-500 hover:bg-blue-600'
                                      }`}
                                    >
                                      {pillType === 'ActionRed' ? 'Action' : pillType}
                                  </button>
                                  );
                                })}
                              </div>
                            {/* Check card type and show appropriate content */}
                            {row.pills.includes('Action') && row.pills.includes('ActionRed') ? (
                              <>
                                {rowVideos[row.id] ? (
                                  <video
                                    src={URL.createObjectURL(rowVideos[row.id])}
                                    controls
                                    className="absolute inset-0 w-full h-full object-cover rounded-lg"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Your browser does not support the video tag.
                                  </video>
                                ) : (
                                  <div className="flex items-center justify-center h-full">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                        openVideoModal(row.id);
                                }}
                                      className="flex items-center justify-center w-12 h-12 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-colors"
                              >
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-12 h-12">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                              </button>
                            </div>
                                )}
                              </>
                            ) : (row.pills.includes('Voice') || row.pills.includes('Eye tracking')) ? (
                              /* Input form for Voice and Eye tracking cards */
                              <div className={`w-full h-full ${row.pills.includes('Voice') ? 'flex items-center justify-center pt-8' : 'p-4 pt-12'}`}>
                                <textarea
                                  value={frontInputs[row.id] || ''}
                                  onChange={(e) => updateFrontInput(row.id, e.target.value)}
                                  onKeyDown={(e) => handleFrontInputKeyPress(e, row.id)}
                                  placeholder={row.pills.includes('Voice') ? "Enter speech here" : "Enter the action here..."}
                                  className={`bg-transparent border-none outline-none resize-none text-gray-600 placeholder-gray-400 ${
                                    row.pills.includes('Voice') 
                                      ? 'w-full h-full text-lg text-center' 
                                      : 'w-full h-full text-sm'
                                  }`}
                                  style={row.pills.includes('Voice') ? {
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    textAlign: 'center',
                                    paddingTop: '2rem'
                                  } : {}}
                                  onClick={(e) => e.stopPropagation()}
                                />
                          </div>
                        ) : (
                              <p>{row.name || `Untitled ${index + 1}`}</p>
                              )}
                            </div>
                          <div className="card-back">
                            {/* Pills positioned absolutely in top right */}
                            <div className="absolute top-2 right-2 flex space-x-1 z-10">
                              {row.pills.map((pillType, pillIndex) => {
                                // First pill (index 0) is solid colored on back
                                const isFirstPill = pillIndex === 0;
                                return (
                                  <button
                                    key={pillIndex}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (pillType === 'ActionRed') {
                                        // Red pill shows back
                                        setFlippedCards(prev => ({ ...prev, [row.id]: true }));
                                      } else {
                                        // Other pill shows front
                                        setFlippedCards(prev => ({ ...prev, [row.id]: false }));
                                      }
                                    }}
                                    className={`py-0.5 px-2 rounded-full text-xs font-medium border cursor-pointer transition-colors ${
                                      isFirstPill 
                                        ? 'bg-transparent text-gray-400 border-gray-300 hover:bg-gray-100'
                                        : pillType === 'Action' ? 'bg-blue-500 text-white border-blue-500 hover:bg-blue-600' :
                                          pillType === 'ActionRed' ? 'bg-red-500 text-white border-red-500 hover:bg-red-600' :
                                          pillType === 'Eye tracking' ? 'bg-cyan-500 text-white border-cyan-500 hover:bg-cyan-600' :
                                          pillType === 'Voice' ? 'bg-sky-500 text-white border-sky-500 hover:bg-sky-600' :
                                          'bg-blue-500 text-white border-blue-500 hover:bg-blue-600'
                                    }`}
                                  >
                                    {pillType === 'ActionRed' ? 'Action' : pillType}
                                  </button>
                                );
                              })}
                            </div>

                              {/* Input section fills the entire card */}
                              <div className="w-full h-full p-4 pt-12">
                                {/* Check if this card has input functionality (Action->Action, Voice, or Eye tracking) */}
                                {(row.pills.includes('Action') && row.pills.includes('ActionRed')) || 
                                 row.pills.includes('Voice') || 
                                 row.pills.includes('Eye tracking') ? (
                                  <textarea
                                    value={backInputs[row.id] || ''}
                                    onChange={(e) => updateBackInput(row.id, e.target.value)}
                                    onKeyDown={(e) => handleBackInputKeyPress(e, row.id)}
                                    placeholder="Enter the action here..."
                                    className="w-full h-full text-sm bg-transparent border-none outline-none resize-none text-gray-600 placeholder-gray-400"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                ) : (
                                  <p className="text-gray-600">Back Side</p>
                                )}
                            </div>
                          </div>
                              </div>
                                </div>
                                </div>
                  ))}
                  
                  {/* Always show drop zone card as the last item */}
                  <div className="relative">
                    <div 
                      className="card drop-zone-card"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, -1)}
                    >
                      <div className="card-inner">
                        <div className="card-front">
                          <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-8 h-8 mx-auto mb-2 text-slate-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                              </svg>
                              <p className="text-sm font-medium text-slate-500">Drag an item here</p>
                              </div>
                              </div>
                      </div>
                        <div className="card-back">
                          <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-8 h-8 mx-auto mb-2 text-slate-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                              </svg>
                              <p className="text-sm font-medium text-slate-500">Drag an item here</p>
                          </div>
                      </div>
                    </div>
                              </div>
                            </div>
                            </div>
                </>
              );
            })()}
          </div>
        ) : (
          <div className="text-center text-gray-500 mt-8">
            Select a board from the sidebar to start building your shortcuts
          </div>
        )}
      </main>

      {/* Video Recording Modal */}
      {showVideoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Record Your Gesture</h2>
              <button
                onClick={closeVideoModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              {!recordedVideo ? (
                <div className="bg-gray-100 rounded-lg p-4">
                  {liveStream ? (
                    <div className="relative">
                      <video
                        ref={(video) => {
                          if (video && liveStream) {
                            video.srcObject = liveStream;
                          }
                        }}
                        autoPlay
                        muted
                        className="w-full rounded-lg"
                      >
                        Your browser does not support the video tag.
                      </video>
                      {isRecording && (
                        <div className="absolute top-4 left-4 flex items-center bg-red-500 text-white px-3 py-1 rounded-full">
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-2"></div>
                          <span className="text-sm font-medium">REC</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <div className="mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-16 h-16 text-gray-400 mx-auto">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                      </div>
                      <p className="text-gray-600 mb-4">
                        Click "Start Recording" to begin capturing your gesture
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-100 rounded-lg p-4">
                  <video
                    src={URL.createObjectURL(recordedVideo)}
                    controls
                    className="w-full rounded-lg"
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={closeVideoModal}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              
              {!recordedVideo ? (
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    isRecording 
                      ? 'bg-red-500 text-white hover:bg-red-600' 
                      : 'bg-indigo-500 text-white hover:bg-indigo-600'
                  }`}
                >
                  {isRecording ? 'Stop Recording' : 'Start Recording'}
                </button>
              ) : (
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setRecordedVideo(null);
                      setIsRecording(false);
                      // Clean up live stream when starting over
                      if (liveStream) {
                        liveStream.getTracks().forEach(track => track.stop());
                        setLiveStream(null);
                      }
                    }}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Record Again
                  </button>
                  <button
                    onClick={saveRecording}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                  >
                    Save Recording
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

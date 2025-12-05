import React, { useState, useRef } from 'react';
import { ChevronRight, ChevronDown, Plus, Trash2, Edit2, Download, Upload, FileText, Image, Tag, Save } from 'lucide-react';

const DraftPrepNotebook = () => {
  const [prep, setPrep] = useState({
    id: 'prep_' + Date.now(),
    name: 'New Preparation',
    notes: '',
    nodes: []
  });
  
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState({});
  const [editingNodeId, setEditingNodeId] = useState(null);
  const [editingPrepName, setEditingPrepName] = useState(false);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  // Helper to find a node by ID
  const findNode = (nodes, id) => {
    for (let node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNode(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Helper to update a node
  const updateNodeInTree = (nodes, id, updater) => {
    return nodes.map(node => {
      if (node.id === id) {
        return updater(node);
      }
      if (node.children) {
        return { ...node, children: updateNodeInTree(node.children, id, updater) };
      }
      return node;
    });
  };

  // Helper to delete a node
  const deleteNodeInTree = (nodes, id) => {
    return nodes.filter(node => {
      if (node.id === id) return false;
      if (node.children) {
        node.children = deleteNodeInTree(node.children, id);
      }
      return true;
    });
  };

  // Get all parent tags
  const getInheritedTags = (nodeId) => {
    const tags = new Set();
    const findParentTags = (nodes, targetId, currentTags = []) => {
      for (let node of nodes) {
        const nodeTags = [...currentTags, ...(node.tags || [])];
        if (node.id === targetId) {
          nodeTags.forEach(t => tags.add(t));
          return true;
        }
        if (node.children && findParentTags(node.children, targetId, nodeTags)) {
          return true;
        }
      }
      return false;
    };
    findParentTags(prep.nodes, nodeId);
    return Array.from(tags);
  };

  const createNode = (parentId = null) => {
    const newNode = {
      id: 'node_' + Date.now(),
      title: 'New Node',
      text: '',
      image: null,
      tags: [],
      children: []
    };

    if (!parentId) {
      setPrep({ ...prep, nodes: [...prep.nodes, newNode] });
    } else {
      setPrep({
        ...prep,
        nodes: updateNodeInTree(prep.nodes, parentId, node => ({
          ...node,
          children: [...(node.children || []), newNode]
        }))
      });
      setExpandedNodes({ ...expandedNodes, [parentId]: true });
    }
    setSelectedNodeId(newNode.id);
  };

  const deleteNode = (id) => {
    if (selectedNodeId === id) setSelectedNodeId(null);
    setPrep({ ...prep, nodes: deleteNodeInTree(prep.nodes, id) });
  };

  const updateNode = (id, updates) => {
    setPrep({
      ...prep,
      nodes: updateNodeInTree(prep.nodes, id, node => ({ ...node, ...updates }))
    });
  };

  const toggleExpand = (id) => {
    setExpandedNodes({ ...expandedNodes, [id]: !expandedNodes[id] });
  };

  const handleImagePaste = (e, nodeId) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let item of items) {
      if (item.type.indexOf('image') !== -1) {
        const blob = item.getAsFile();
        const reader = new FileReader();
        reader.onload = (event) => {
          updateNode(nodeId, { image: event.target.result });
        };
        reader.readAsDataURL(blob);
        e.preventDefault();
        break;
      }
    }
  };

  const handleImageUpload = (e, nodeId) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      updateNode(nodeId, { image: event.target.result });
    };
    reader.readAsDataURL(file);
  };

  const exportPrep = () => {
    const dataStr = JSON.stringify(prep, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${prep.name.replace(/[^a-z0-9]/gi, '_')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importPrep = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedPrep = JSON.parse(event.target.result);
        setPrep(importedPrep);
        setSelectedNodeId(null);
        setExpandedNodes({});
      } catch (err) {
        alert('Failed to import prep: Invalid JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const addTag = (nodeId, tag) => {
    const node = findNode(prep.nodes, nodeId);
    if (!node || !tag.trim()) return;
    if (!node.tags.includes(tag.trim())) {
      updateNode(nodeId, { tags: [...node.tags, tag.trim()] });
    }
  };

  const removeTag = (nodeId, tag) => {
    const node = findNode(prep.nodes, nodeId);
    if (!node) return;
    updateNode(nodeId, { tags: node.tags.filter(t => t !== tag) });
  };

  const renderNode = (node, level = 0) => {
    const isExpanded = expandedNodes[node.id];
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedNodeId === node.id;
    const isEditing = editingNodeId === node.id;

    return (
      <div key={node.id} style={{ marginLeft: level * 16 + 'px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '6px 8px',
            backgroundColor: isSelected ? '#374151' : 'transparent',
            borderRadius: '4px',
            cursor: 'pointer',
            marginBottom: '2px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isSelected ? '#374151' : '#1f2937'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isSelected ? '#374151' : 'transparent'}
        >
          <div
            style={{ width: '20px', display: 'flex', alignItems: 'center' }}
            onClick={() => hasChildren && toggleExpand(node.id)}
          >
            {hasChildren && (isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
          </div>
          
          {isEditing ? (
            <input
              autoFocus
              value={node.title}
              onChange={(e) => updateNode(node.id, { title: e.target.value })}
              onBlur={() => setEditingNodeId(null)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingNodeId(null)}
              style={{
                flex: 1,
                background: '#1f2937',
                border: '1px solid #4b5563',
                borderRadius: '4px',
                padding: '4px 8px',
                color: '#e5e7eb',
                fontSize: '14px'
              }}
            />
          ) : (
            <span
              onClick={() => setSelectedNodeId(node.id)}
              style={{ flex: 1, fontSize: '14px' }}
            >
              {node.title}
            </span>
          )}
          
          <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
            <button
              onClick={(e) => { e.stopPropagation(); setEditingNodeId(node.id); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '2px' }}
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); createNode(node.id); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '2px' }}
            >
              <Plus size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px' }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        
        {isExpanded && hasChildren && node.children.map(child => renderNode(child, level + 1))}
      </div>
    );
  };

  const selectedNode = selectedNodeId ? findNode(prep.nodes, selectedNodeId) : null;
  const inheritedTags = selectedNode ? getInheritedTags(selectedNodeId) : [];

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#111827', color: '#e5e7eb', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Sidebar */}
      <div style={{ width: '320px', borderRight: '1px solid #374151', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid #374151' }}>
          {editingPrepName ? (
            <input
              autoFocus
              value={prep.name}
              onChange={(e) => setPrep({ ...prep, name: e.target.value })}
              onBlur={() => setEditingPrepName(false)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingPrepName(false)}
              style={{
                width: '100%',
                background: '#1f2937',
                border: '1px solid #4b5563',
                borderRadius: '4px',
                padding: '8px',
                color: '#e5e7eb',
                fontSize: '18px',
                fontWeight: '600'
              }}
            />
          ) : (
            <h2
              onClick={() => setEditingPrepName(true)}
              style={{ margin: 0, fontSize: '18px', fontWeight: '600', cursor: 'pointer' }}
            >
              {prep.name}
            </h2>
          )}
          
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button
              onClick={() => createNode()}
              style={{
                flex: 1,
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontSize: '14px'
              }}
            >
              <Plus size={16} /> New Node
            </button>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button
              onClick={exportPrep}
              style={{
                flex: 1,
                backgroundColor: '#1f2937',
                color: '#e5e7eb',
                border: '1px solid #4b5563',
                borderRadius: '4px',
                padding: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontSize: '13px'
              }}
            >
              <Download size={14} /> Export
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                flex: 1,
                backgroundColor: '#1f2937',
                color: '#e5e7eb',
                border: '1px solid #4b5563',
                borderRadius: '4px',
                padding: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontSize: '13px'
              }}
            >
              <Upload size={14} /> Import
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={importPrep}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        {/* Tree */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          <div
            onClick={() => setSelectedNodeId(null)}
            style={{
              padding: '8px',
              marginBottom: '8px',
              backgroundColor: !selectedNodeId ? '#374151' : 'transparent',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <FileText size={16} />
            <span style={{ fontSize: '14px', fontWeight: '500' }}>Prep Notes</span>
          </div>
          {prep.nodes.map(node => renderNode(node))}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!selectedNode ? (
          // Prep-level notes
          <div style={{ padding: '24px', overflowY: 'auto' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '16px' }}>
              {prep.name}
            </h1>
            <textarea
              value={prep.notes}
              onChange={(e) => setPrep({ ...prep, notes: e.target.value })}
              placeholder="Write your general notes for this preparation here..."
              style={{
                width: '100%',
                minHeight: '400px',
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                padding: '16px',
                color: '#e5e7eb',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical',
                lineHeight: '1.6'
              }}
            />
          </div>
        ) : (
          // Node content
          <div style={{ padding: '24px', overflowY: 'auto' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
              {selectedNode.title}
            </h1>

            {/* Tags */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                <Tag size={16} color="#9ca3af" />
                {inheritedTags.length > 0 && (
                  <>
                    {inheritedTags.map(tag => (
                      <span
                        key={tag}
                        style={{
                          backgroundColor: '#374151',
                          color: '#9ca3af',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontStyle: 'italic'
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </>
                )}
                {selectedNode.tags.map(tag => (
                  <span
                    key={tag}
                    style={{
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(selectedNode.id, tag)}
                      style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 0 }}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  placeholder="+ Add tag"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addTag(selectedNode.id, e.target.value);
                      e.target.value = '';
                    }
                  }}
                  style={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #4b5563',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    color: '#e5e7eb',
                    fontSize: '12px',
                    width: '120px'
                  }}
                />
              </div>
            </div>

            {/* Image */}
            <div style={{ marginBottom: '16px' }}>
              {selectedNode.image ? (
                <div style={{ position: 'relative' }}>
                  <img
                    src={selectedNode.image}
                    alt="Draft screenshot"
                    style={{
                      width: '100%',
                      maxWidth: '800px',
                      borderRadius: '8px',
                      border: '1px solid #374151'
                    }}
                  />
                  <button
                    onClick={() => updateNode(selectedNode.id, { image: null })}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '6px 12px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Remove Image
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    style={{
                      backgroundColor: '#1f2937',
                      color: '#e5e7eb',
                      border: '1px solid #4b5563',
                      borderRadius: '4px',
                      padding: '8px 16px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '14px'
                    }}
                  >
                    <Image size={16} /> Upload Image
                  </button>
                  <span style={{ color: '#9ca3af', fontSize: '14px', display: 'flex', alignItems: 'center' }}>
                    or paste image into text area (Ctrl+V)
                  </span>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, selectedNode.id)}
                    style={{ display: 'none' }}
                  />
                </div>
              )}
            </div>

            {/* Notes */}
            <textarea
              value={selectedNode.text}
              onChange={(e) => updateNode(selectedNode.id, { text: e.target.value })}
              onPaste={(e) => handleImagePaste(e, selectedNode.id)}
              placeholder="Write your notes here... (You can paste images with Ctrl+V)"
              style={{
                width: '100%',
                minHeight: '400px',
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                padding: '16px',
                color: '#e5e7eb',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical',
                lineHeight: '1.6'
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default DraftPrepNotebook;
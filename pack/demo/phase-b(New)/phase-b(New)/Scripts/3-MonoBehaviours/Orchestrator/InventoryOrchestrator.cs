using System;
using System.Linq;
using System.Collections;
using System.Collections.Generic;

using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.UI;
using TMPro;

using SPACE_UTIL;

/// <summary>
/// wires Field_InventorySlot instances to InventoryDataService — handles tool switching, actions, drag-drop
/// </summary>
public class InventoryOrchestrator : MonoBehaviour
{
	#region Inspector Fields
	[SerializeField] Transform _hotbarContainer;
	[SerializeField] Transform _extendedContainer;
	[SerializeField] GameObject _pfInventorySlot;
	[SerializeField] PlayerMovement _playerMovement;
	[Header("Drag Ghost")]
	[SerializeField] GameObject _dragGhostIcon;
	[SerializeField] Image _dragGhostImage;
	[SerializeField] TMP_Text _dragGhostAmountText;
	[Header("Selected Item Info Panel")]
	[SerializeField] GameObject _selectedItemInfo;
	[SerializeField] TMP_Text _selectedItemNameText;
	[SerializeField] TMP_Text _selectedItemDescText;
	[SerializeField] TMP_Text _selectedItemAmountText;
	[SerializeField] Image _selectedItemIcon;
	[SerializeField] TMP_Text _equipButtonText;
	[SerializeField] Button _equipButton;
	[SerializeField] Button _dropButton;
	#endregion

	#region private API
	InventoryDataService dataService;
	List<Field_InventorySlot> FIELD_SLOT = new List<Field_InventorySlot>();
	List<UIEventRelay> RELAY_SLOT = new List<UIEventRelay>();
	BaseHeldTool previousActiveTool;
	int dragFromIndex = -1;

	void BuildSlotFields()
	{
		_hotbarContainer.destroyLeaves();
		_extendedContainer.destroyLeaves();
		FIELD_SLOT.Clear();
		for (int i = 0; i < dataService.GetTotalSize(); i++)
		{
			var slot = dataService.GetSlots()[i];
			Transform parent = slot.IsHotbar ? _hotbarContainer : _extendedContainer;
			var field = GameObject.Instantiate(_pfInventorySlot, parent).gc<Field_InventorySlot>();
			field.SetEmpty();
			field.SetIsHotbar(slot.IsHotbar);
			var relay = field.gameObject.AddComponent<UIEventRelay>();
			relay.Index = i;
			relay.onBeginDrag = HandleBeginDrag;
			relay.onDrag = HandleDrag;
			relay.onEndDrag = HandleEndDrag;
			relay.onDrop = HandleDrop;
			relay.onPointerEnter = (r) => FIELD_SLOT[r.Index].SetHovered(true);
			relay.onPointerExit = (r) => FIELD_SLOT[r.Index].SetHighlighted(r.Index == dataService.ActiveSlotIndex);
			relay.onPointerDown = (r) => UpdateSelectedItemInfo(dataService.GetSlots()[r.Index].Tool);
			FIELD_SLOT.Add(field);
			RELAY_SLOT.Add(relay);
		}
	}
	void RefreshAllSlots()
	{
		for (int i = 0; i < FIELD_SLOT.Count; i++)
		{
			var slot = dataService.GetSlots()[i];
			if (slot.Tool != null)
			{
				Sprite icon = (slot.Tool is IIconItem iconItem) ? iconItem.GetIcon() : null;
				FIELD_SLOT[i].SetData(icon, slot.Tool.Name, slot.Tool.Quantity);
				FIELD_SLOT[i].SetHighlighted(i == dataService.ActiveSlotIndex);
			}
			else
			{
				FIELD_SLOT[i].SetEmpty();
			}
		}
	}
	void HandleToolPickup(BaseHeldTool tool)
	{
		int idx = dataService.TryAdd(tool, -1);
		if (idx == -1) { Debug.Log("inventory full".colorTag("red")); return; }
		tool.gameObject.SetActive(false);
		tool.Owner = _playerMovement;
		if (tool.EquipWhenPickedUp && idx < dataService.GetHotbarSize())
			SwitchToSlot(idx);
		// purpose: inform other systems that tool was picked up
		GameEvents.RaiseItemPickedUp(tool);
		RefreshAllSlots();
	}
	void SwitchToSlot(int index)
	{
		if (previousActiveTool != null) previousActiveTool.gameObject.SetActive(false);
		var slot = dataService.GetSlots()[index];
		if (slot.Tool == previousActiveTool && slot.Tool != null)
		{
			previousActiveTool.gameObject.SetActive(false);
			previousActiveTool = null;
			dataService.SwitchTo(index);
			RefreshAllSlots();
			return;
		}
		dataService.SwitchTo(index);
		previousActiveTool = dataService.ActiveTool;
		if (previousActiveTool != null)
		{
			previousActiveTool.Owner = _playerMovement;
			previousActiveTool.gameObject.SetActive(true);
		}
		// purpose: notify FresnelHighlighter and other systems about tool change
		GameEvents.RaiseToolSwitched(index);
		RefreshAllSlots();
	}
	void HandleDropActiveTool()
	{
		BaseHeldTool tool = dataService.ActiveTool;
		if (tool == null) return;
		tool.DropItem();
		dataService.Remove(tool);
		previousActiveTool = null;
		// purpose: inform other systems that tool was dropped
		GameEvents.RaiseItemDropped(tool);
		RefreshAllSlots();
	}
	#endregion

	#region private API — drag-drop
	void HandleBeginDrag(UIEventRelay relay, UnityEngine.EventSystems.PointerEventData e)
	{
		var slot = dataService.GetSlots()[relay.Index];
		if (slot.Tool == null) return;
		dragFromIndex = relay.Index;
		FIELD_SLOT[relay.Index].SetDragVisible(false);
		_dragGhostIcon.SetActive(true);
		_dragGhostImage.sprite = (slot.Tool is IIconItem icon) ? icon.GetIcon() : null;
		_dragGhostAmountText.text = slot.Tool.Quantity > 1 ? slot.Tool.Quantity.ToString() : "";
		_dragGhostIcon.transform.SetAsLastSibling();
	}
	void HandleDrag(UnityEngine.EventSystems.PointerEventData e)
	{
		_dragGhostIcon.transform.position = e.position;
	}
	void HandleEndDrag(UIEventRelay relay, UnityEngine.EventSystems.PointerEventData e)
	{
		FIELD_SLOT[relay.Index].SetDragVisible(true);
		_dragGhostIcon.SetActive(false);
		if (e.pointerEnter == null && dragFromIndex >= 0)
		{
			// dropped outside UI → drop the item
			var slot = dataService.GetSlots()[dragFromIndex];
			if (slot.Tool != null) { slot.Tool.DropItem(); dataService.Remove(slot.Tool); }
		}
		dragFromIndex = -1;
		RefreshAllSlots();
	}
	void HandleDrop(UIEventRelay relay, UnityEngine.EventSystems.PointerEventData e)
	{
		if (dragFromIndex < 0 || dragFromIndex == relay.Index) return;
		dataService.Swap(dragFromIndex, relay.Index);
		RefreshAllSlots();
	}
	#endregion

	#region extra
	// nice-to-have: selected item info panel — click a slot in extended inventory to see name/desc/icon + equip/drop buttons
	BaseHeldTool selectedTool;
	void UpdateSelectedItemInfo(BaseHeldTool tool)
	{
		selectedTool = tool;
		if (tool == null) { _selectedItemInfo.SetActive(false); return; }
		_selectedItemInfo.SetActive(true);
		_selectedItemNameText.text = tool.Name;
		_selectedItemDescText.text = tool.Description;
		_selectedItemAmountText.text = tool.Quantity > 1 ? tool.Quantity.ToString() : "";
		_selectedItemIcon.sprite = (tool is IIconItem icon) ? icon.GetIcon() : null;
		_equipButtonText.text = (tool is ToolBuilder) ? "Build" : "Equip";
	}
	void EquipSelectedTool()
	{
		if (selectedTool == null) return;
		int idx = dataService.GetIndexFor(selectedTool);
		if (idx >= 0) SwitchToSlot(idx);
		// purpose: close inventory after equipping
		GameEvents.RaiseCloseInventoryView();
	}
	void DropSelectedTool()
	{
		if (selectedTool == null) return;
		selectedTool.DropItem();
		dataService.Remove(selectedTool);
		// purpose: inform other systems tool dropped
		GameEvents.RaiseItemDropped(selectedTool);
		UpdateSelectedItemInfo(null);
		RefreshAllSlots();
	}
	#endregion

	#region public API
	/// <summary> init from SubManager </summary>
	public void Init(InventoryDataService dataService)
	{
		this.dataService = dataService;
		this.dataService.Build();
		BuildSlotFields();
		RefreshAllSlots();
		SubscribeEvents();
		if (_equipButton != null) _equipButton.onClick.AddListener(() => EquipSelectedTool());
		if (_dropButton != null) _dropButton.onClick.AddListener(() => DropSelectedTool());
		if (_selectedItemInfo != null) UpdateSelectedItemInfo(null);
	}
	/// <summary> expose dataService for test snapshot </summary>
	public InventoryDataService GetDataServiceForTest() => dataService;
	#endregion

	#region private API — subscriptions
	void SubscribeEvents()
	{
		// purpose: InventoryOrchestrator adds this tool to hotbar
		GameEvents.OnToolPickupRequested += HandleToolPickup;
		// purpose: refresh money display on hotbar (cart total, etc.)
		GameEvents.OnMoneyChanged += (money) => RefreshAllSlots();
	}
	#endregion

	#region Unity Life Cycle
	private void Update()
	{
		if (Singleton<UIManager>.Ins.isAnyMenuOpen) return;
		// hotbar keys 1-0
		if (INPUT.K.InstantDown(KeyCode.Alpha1)) SwitchToSlot(0);
		else if (INPUT.K.InstantDown(KeyCode.Alpha2)) SwitchToSlot(1);
		else if (INPUT.K.InstantDown(KeyCode.Alpha3)) SwitchToSlot(2);
		else if (INPUT.K.InstantDown(KeyCode.Alpha4)) SwitchToSlot(3);
		else if (INPUT.K.InstantDown(KeyCode.Alpha5)) SwitchToSlot(4);
		else if (INPUT.K.InstantDown(KeyCode.Alpha6)) SwitchToSlot(5);
		else if (INPUT.K.InstantDown(KeyCode.Alpha7)) SwitchToSlot(6);
		else if (INPUT.K.InstantDown(KeyCode.Alpha8)) SwitchToSlot(7);
		else if (INPUT.K.InstantDown(KeyCode.Alpha9)) SwitchToSlot(8);
		else if (INPUT.K.InstantDown(KeyCode.Alpha0)) SwitchToSlot(9);

		// scroll wheel
		float scroll = Input.GetAxis("Mouse ScrollWheel");
		if (scroll != 0f) { dataService.Scroll(scroll > 0f ? 1 : -1); SwitchToSlot(dataService.ActiveSlotIndex); }

		// tool actions
		BaseHeldTool active = dataService.ActiveTool;
		if (active != null)
		{
			if (INPUT.K.InstantDown(KeyCode.Mouse0)) active.PrimaryFire();
			if (Input.GetMouseButton(0)) active.PrimaryFireHeld();
			if (INPUT.K.InstantDown(KeyCode.Mouse1)) active.SecondaryFire();
			if (Input.GetMouseButton(1)) active.SecondaryFireHeld();
			if (INPUT.K.InstantDown(KeyCode.R)) active.Reload();
			if (INPUT.K.InstantDown(KeyCode.Q)) active.QButtonPressed();
			if (INPUT.K.InstantDown(KeyCode.G)) HandleDropActiveTool();
		}
	}
	private void OnDestroy()
	{
		GameEvents.OnToolPickupRequested -= HandleToolPickup;
	}
	#endregion
}
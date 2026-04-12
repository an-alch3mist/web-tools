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
/// base class for all equippable tools — implements IInteractable, IIconItem, ISaveLoadableObject(stub)
/// </summary>
public class BaseHeldTool : BaseSellableItem, IInteractable, ISaveLoadableObject, IIconItem
{
	#region Inspector Fields
	[SerializeField] SavableObjectID _savableObjectID;
	[SerializeField] string _name = "test";
	[TextArea] [SerializeField] string _description = "description";
	[SerializeField] Sprite _programmerIcon;
	[SerializeField] Sprite _inventoryIcon;
	[SerializeField] int _quantity = 1;
	[SerializeField] int _maxAmount = 1;
	[SerializeField] bool _equipWhenPickedUp;
	[SerializeField] bool _shouldUseInteractionWheel = true;
	[SerializeField] protected GameObject _worldModel;
	[SerializeField] protected GameObject _viewModel;
	[SerializeField] protected Animator _viewModelAnimator;
	[SerializeField] List<SO_InteractionOption> _interactions;
	#endregion

	#region private API
	[HideInInspector] public PlayerMovement Owner;
	#endregion

	#region public API — tool identity
	public string Name => _name;
	public string Description => _description;
	public int Quantity { get => _quantity; set => _quantity = value; }
	public int MaxAmount => _maxAmount;
	public bool EquipWhenPickedUp => _equipWhenPickedUp;
	#endregion

	#region public API — tool actions (virtual)
	/// <summary> single click fire </summary>
	public virtual void PrimaryFire()
	{
		if (_viewModelAnimator != null) _viewModelAnimator.Play("Attack1", -1, 0f);
	}
	/// <summary> held fire (continuous) </summary>
	public virtual void PrimaryFireHeld() { }
	/// <summary> single right click </summary>
	public virtual void SecondaryFire() { }
	/// <summary> held right click </summary>
	public virtual void SecondaryFireHeld() { }
	/// <summary> R key </summary>
	public virtual void Reload() { }
	/// <summary> Q key </summary>
	public virtual void QButtonPressed() { }
	#endregion

	#region public API — equip / drop
	/// <summary> drop this tool from inventory to world </summary>
	public virtual void DropItem()
	{
		gameObject.SetActive(true);
		HideWorldModel(hide: false);
		HideViewModel();
		Rigidbody rb = GetComponentInChildren<Rigidbody>();
		if (rb != null && Owner != null)
		{
			Camera cam = Owner.PlayerCam;
			transform.parent = null;
			rb.isKinematic = false;
			rb.transform.position = cam.transform.position + cam.transform.forward * 0.5f;
			rb.linearVelocity = cam.transform.forward * 5f;
			rb.rotation = cam.transform.rotation;
		}
		Owner = null;
	}
	/// <summary> show/hide view model </summary>
	public virtual void HideViewModel(bool hide = true) { if (_viewModel != null) _viewModel.SetActive(!hide); }
	/// <summary> show/hide world model </summary>
	public virtual void HideWorldModel(bool hide = true) { if (_worldModel != null) _worldModel.SetActive(!hide); }
	#endregion

	#region extra
	// nice-to-have: Equip/UnEquip — called by InventoryOrchestrator during SwitchTool transitions
	/// <summary> called when tool becomes active — hides world, shows view </summary>
	public virtual void Equip() { HideWorldModel(); HideViewModel(hide: false); }
	/// <summary> called when tool is deactivated — hides view </summary>
	public virtual void UnEquip() { HideViewModel(); }
	#endregion

	#region public API — IIconItem
	/// <summary> returns inventory icon </summary>
	public virtual Sprite GetIcon() => _inventoryIcon != null ? _inventoryIcon : _programmerIcon;
	#endregion

	#region public API — IInteractable
	public bool ShouldUseInteractionWheel() => _shouldUseInteractionWheel;
	public List<SO_InteractionOption> GetOptions() => _interactions;
	public string GetObjectName() => _name;
	public virtual void Interact(SO_InteractionOption selectedOption)
	{
		if (selectedOption.interactionName == "Take")
		{
			// purpose: InventoryOrchestrator adds this tool to hotbar
			GameEvents.RaiseToolPickupRequested(this);
		}
		else if (selectedOption.interactionName == "Destroy")
		{
			Destroy(gameObject);
		}
	}
	#endregion

	#region public API — ISaveLoadableObject (stub)
	public bool HasBeenSaved { get; set; }
	public bool ShouldBeSaved() => true;
	public SavableObjectID GetSavableObjectID() => _savableObjectID;
	public Vector3 GetPosition() => _worldModel != null ? _worldModel.transform.position : transform.position;
	public Vector3 GetRotation() => _worldModel != null ? _worldModel.transform.rotation.eulerAngles : transform.rotation.eulerAngles;
	public virtual void LoadFromSave(string json) { /* Phase G */ }
	public virtual string GetCustomSaveData() => "{}"; /* Phase G */
	#endregion

	#region Unity Life Cycle
	protected override void OnEnable()
	{
		base.OnEnable();
		if (Owner == null)
		{
			HideViewModel();
			HideWorldModel(hide: false);
			return;
		}
		HideWorldModel();
		HideViewModel(hide: false);
		if (transform.parent == null || transform.parent != Owner.ViewModelContainer)
		{
			transform.position = Owner.ViewModelContainer.position;
			transform.rotation = Owner.ViewModelContainer.rotation;
			transform.parent = Owner.ViewModelContainer;
		}
	}
	#endregion
}
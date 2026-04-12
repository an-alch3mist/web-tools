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
/// toggle inventory panel — lifecycle + toggle only
/// </summary>
public class InventoryUI : MonoBehaviour
{
	#region Inspector Fields
	[SerializeField] InventoryOrchestrator _orchestrator;
	#endregion

	#region private API
	InventoryDataService inventoryDataService = new InventoryDataService();
	#endregion

	#region Unity Life Cycle
	bool isFirstEnable = true;
	private void OnEnable()
	{
		Debug.Log(C.method(this));
		if (isFirstEnable)
		{
			Debug.Log("InventoryUI first time enabled".colorTag("lime"));
			_orchestrator.Init(inventoryDataService);
			// purpose: InventoryUI self-activates when inventory view is opened
			GameEvents.OnOpenInventoryView += () => this.gameObject.SetActive(true);
			// purpose: InventoryUI self-deactivates when inventory view is closed
			GameEvents.OnCloseInventoryView += () => this.gameObject.SetActive(false);
			this.gameObject.SetActive(false);
			isFirstEnable = false;
			return;
		}
		// purpose: cursor lock/unlock for player controller
		GameEvents.RaiseMenuStateChanged(isAnyMenuOpen: true);
	}
	private void Update()
	{
		if (INPUT.K.InstantDown(KeyCode.Escape) || INPUT.K.InstantDown(KeyCode.Tab))
		{
			// purpose: close inventory panel
			GameEvents.RaiseCloseInventoryView();
		}
	}
	private void OnDisable()
	{
		Debug.Log(C.method(this, "orange"));
		// purpose: cursor lock/unlock for player controller
		GameEvents.RaiseMenuStateChanged(isAnyMenuOpen: false);
	}
	#endregion
}
using System.Collections.Generic;
using UnityEngine;
using HighlightPlus;

/// <summary>
/// outlines whatever the player looks at — powered by Highlight Plus asset
/// </summary>
public class FresnelHighlighter : MonoBehaviour
{
	#region Inspector Fields
	[Header("Profiles (Create: Create → Highlight Plus → Profile)")]
	[SerializeField] HighlightProfile _toolProfile;
	[SerializeField] HighlightProfile _grabbableProfile;
	[SerializeField] HighlightProfile _buildingProfile;
	[SerializeField] HighlightProfile _wrenchEnableProfile;
	[SerializeField] HighlightProfile _wrenchDisableProfile;

	[Header("Raycast")]
	[SerializeField] Camera _cam;
	[SerializeField] float _interactRange = 2f;
	[SerializeField] LayerMask _interactLayerMask;
	#endregion

	#region private API
	readonly List<HighlightEffect> activeEffects = new List<HighlightEffect>();

	void HighlightObject(GameObject obj, HighlightProfile profile)
	{
		var effect = obj.GetComponent<HighlightEffect>();
		if (effect == null) effect = obj.AddComponent<HighlightEffect>();
		effect.ProfileLoad(profile);
		effect.SetHighlighted(true);
		activeEffects.Add(effect);
	}
	void ClearAll()
	{
		foreach (var effect in activeEffects)
			if (effect != null) effect.SetHighlighted(false);
		activeEffects.Clear();
	}
	void OutlineLookedAtThing()
	{
		if (!Physics.Raycast(_cam.transform.position, _cam.transform.forward, out RaycastHit hit, _interactRange, _interactLayerMask))
			return;
		if (hit.collider.GetComponentInParent<BaseHeldTool>() != null)
		{
			HighlightObject(hit.collider.gameObject, _toolProfile);
			return;
		}
		if (hit.collider.CompareTag("Grabbable"))
		{
			HighlightObject(hit.collider.gameObject, _grabbableProfile);
			return;
		}
		// Phase A: ComputerTerminal, ContractsTerminal → _toolProfile
		// Phase D: BuildingObject (ToolHammer → _buildingProfile, ToolSupportsWrench → _wrenchEnable/_wrenchDisableProfile)
	}
	#endregion

	#region Unity Life Cycle
	private void Update()
	{
		ClearAll();
		OutlineLookedAtThing();
	}
	#endregion
}
using UnityEngine;

/// <summary>
/// toggles a light on equip/unequip — primary fire toggles light
/// </summary>
public class ToolMiningHat : BaseHeldTool
{
	#region Inspector Fields
	[SerializeField] GameObject _worldModelLight;
	[SerializeField] GameObject _viewModelLight;
	#endregion

	#region private API
	bool isOn;
	void ToggleLight(bool enable)
	{
		isOn = enable;
		_worldModelLight.SetActive(isOn);
		_viewModelLight.SetActive(isOn);
		// Phase H: play toggle sound
	}
	#endregion

	#region public API — overrides
	public override void PrimaryFire() => ToggleLight(!isOn);
	public override void Interact(SO_InteractionOption selectedOption)
	{
		if (selectedOption.interactionName == "Toggle") ToggleLight(!isOn);
		else base.Interact(selectedOption);
	}
	#endregion

	#region Unity Life Cycle
	protected override void OnEnable() { base.OnEnable(); ToggleLight(isOn); }
	protected override void OnDisable() { base.OnDisable(); ToggleLight(isOn); }
	#endregion
}
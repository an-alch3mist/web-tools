using UnityEngine;
using TMPro;

/// <summary>
/// shows resource info text on raycast hit while equipped
/// </summary>
public class ToolResourceScanner : BaseHeldTool
{
	#region Inspector Fields
	[SerializeField] float _useRange = 3f;
	[SerializeField] TMP_Text _thingNameText;
	[SerializeField] LayerMask _scanLayers;
	#endregion

	#region public API — overrides
	public override void PrimaryFire() { }
	#endregion

	#region Unity Life Cycle
	private void Update()
	{
		if (Owner == null) return;
		Camera cam = Owner.PlayerCam;
		if (cam == null) return;
		string text = "No Target";
		if (Physics.Raycast(cam.transform.position, cam.transform.forward, out RaycastHit hit, _useRange, _scanLayers))
		{
			BaseHeldTool tool = hit.collider.GetComponentInParent<BaseHeldTool>();
			if (tool != null) text = tool.Name;
			// Phase C: OreNode, OrePiece identification
			// Phase D: BuildingObject identification
		}
		_thingNameText.text = text;
	}
	#endregion
}
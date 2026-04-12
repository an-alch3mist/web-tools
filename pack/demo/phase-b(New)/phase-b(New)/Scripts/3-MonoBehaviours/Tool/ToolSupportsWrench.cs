using UnityEngine;

/// <summary>
/// toggle building supports on/off — primary disables, secondary enables
/// </summary>
public class ToolSupportsWrench : BaseHeldTool
{
	#region Inspector Fields
	[SerializeField] float _useRange = 3f;
	#endregion

	#region public API — overrides
	public override void PrimaryFire()
	{
		if (Owner == null) return;
		Camera cam = Owner.PlayerCam;
		if (cam == null || !Physics.Raycast(cam.transform.position, cam.transform.forward, out RaycastHit hit, _useRange)) return;
		// Phase D: hit.collider.GetComponentInParent<BuildingObject>()?.EnableBuildingSupports(false);
	}
	public override void SecondaryFire()
	{
		if (Owner == null) return;
		Camera cam = Owner.PlayerCam;
		if (cam == null || !Physics.Raycast(cam.transform.position, cam.transform.forward, out RaycastHit hit, _useRange)) return;
		// Phase D: hit.collider.GetComponentInParent<BuildingObject>()?.EnableBuildingSupports(true);
	}
	#endregion
}
using UnityEngine;

/// <summary>
/// pick up / pack placed buildings — primary = take/pack, secondary = pack only
/// </summary>
public class ToolHammer : BaseHeldTool
{
	#region Inspector Fields
	[SerializeField] float _useRange = 3f;
	#endregion

	#region public API — overrides
	public override void PrimaryFire()
	{
		if (Owner == null) return;
		Camera cam = Owner.PlayerCam;
		if (cam == null) return;
		if (!Physics.Raycast(cam.transform.position, cam.transform.forward, out RaycastHit hit, _useRange)) return;
		// Phase D: BuildingObject / BuildingCrate interaction
		// BuildingObject bo = hit.collider.GetComponentInParent<BuildingObject>();
		// if (bo != null) { bo.TryTakeOrPack(); return; }
		// BuildingCrate bc = hit.collider.GetComponentInParent<BuildingCrate>();
		// if (bc != null) bc.TryAddToInventory();
	}
	public override void SecondaryFire()
	{
		if (Owner == null) return;
		Camera cam = Owner.PlayerCam;
		if (cam == null) return;
		if (!Physics.Raycast(cam.transform.position, cam.transform.forward, out RaycastHit hit, _useRange)) return;
		// Phase D: BuildingObject.Pack()
	}
	#endregion
}
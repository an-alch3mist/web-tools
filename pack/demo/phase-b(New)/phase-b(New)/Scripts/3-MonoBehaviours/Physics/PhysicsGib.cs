using System.Collections;
using UnityEngine;

/// <summary>
/// debris piece that despawns after time
/// </summary>
public class PhysicsGib : BaseSellableItem
{
	#region private API
	float despawnTime = 8f;
	#endregion

	#region public API
	/// <summary> detach from parent, enable, apply velocity, start despawn timer </summary>
	public void DetachAndDespawn(Vector3? velocity = null)
	{
		transform.SetParent(null);
		gameObject.SetActive(true);
		if (velocity.HasValue && Rb != null)
			Rb.linearVelocity = velocity.Value;
		StartCoroutine(WaitThenDespawn());
	}
	#endregion

	#region private API
	IEnumerator WaitThenDespawn()
	{
		yield return new WaitForSeconds(despawnTime * Random.Range(0.7f, 1.3f));
		if (this != null) Destroy(gameObject);
	}
	#endregion
}
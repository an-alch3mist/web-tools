using UnityEngine;

/// <summary>
/// marks where the player spawns — static random picker
/// </summary>
public class PlayerSpawnPoint : MonoBehaviour
{
	#region private API
	static PlayerSpawnPoint[] allPoints;
	#endregion

	#region public API
	/// <summary> returns a random spawn point position </summary>
	public static Vector3 GetRandomSpawnPoint()
	{
		if (allPoints == null || allPoints.Length == 0)
			allPoints = FindObjectsOfType<PlayerSpawnPoint>();
		return allPoints[Random.Range(0, allPoints.Length)].transform.position;
	}
	#endregion

	#region Unity Life Cycle
	private void Awake()
	{
		allPoints = null; // reset cache on scene load
	}
	#endregion
}
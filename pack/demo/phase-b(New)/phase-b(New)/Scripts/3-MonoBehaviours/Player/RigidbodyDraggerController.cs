using UnityEngine;

/// <summary>
/// auto-releases grab when SpringJoint breaks — attach to RigidbodyDragger GO
/// </summary>
public class RigidbodyDraggerController : MonoBehaviour
{
	[SerializeField] PlayerGrab _playerGrab;

	private void OnJointBreak(float breakForce)
	{
		if (_playerGrab != null) _playerGrab.ForceRelease();
	}
}
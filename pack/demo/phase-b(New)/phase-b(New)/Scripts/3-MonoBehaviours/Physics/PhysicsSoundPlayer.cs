using UnityEngine;

/// <summary>
/// plays sound on collision impact — uses cooldown to avoid spam
/// </summary>
public class PhysicsSoundPlayer : MonoBehaviour
{
	#region Inspector Fields
	[SerializeField] AudioClip _impactClip;
	[SerializeField] float _minImpactVelocity = 1f;
	[SerializeField] float _cooldown = 0.1f;
	#endregion

	#region private API
	float lastPlayTime;
	#endregion

	#region Unity Life Cycle
	private void OnCollisionEnter(Collision collision)
	{
		if (collision.contactCount == 0 || Time.time - lastPlayTime < _cooldown) return;
		float sqrVel = collision.relativeVelocity.sqrMagnitude;
		if (sqrVel <= _minImpactVelocity) return;
		lastPlayTime = Time.time;
		// Phase H: Singleton<SoundManager>.Ins.PlaySoundAtLocation(_impactDef, collision.GetContact(0).point);
	}
	#endregion

	#region public API
	/// <summary> force play impact sound at this position </summary>
	public void PlayImpactSound()
	{
		// Phase H: Singleton<SoundManager>.Ins.PlaySoundAtLocation(_impactDef, transform.position);
	}
	#endregion
}